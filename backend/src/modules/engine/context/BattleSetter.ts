import { BattleStateRepository } from "@/modules/battles/repositories/BattleStateRepository";
import { PendingQueueRepository } from "@/modules/battles/repositories/PendingQueueRepository";
import { TokenTemplateRepository } from "@/modules/asset-library/tokens/repositories/TokenTemplateRepository";
import { ItemRepository } from "@/modules/items/repositories/ItemRepository";
import { CardRepository } from "@/modules/cards/repositories/CardRepository";

import { ActionChoiceDTO, AddActionHistoryDTO } from "./dto/battleDtos";
import { VisualOverlay } from "../mechanic/types/visualOverlays";
import { MechanicEntityInstance } from "../mechanic/types/mechanicEntity";
import { mountMechanicEntity } from "../mechanic/utils/functions";
import { PivotCandidate } from "./dao/pendingDaos";
import { discoverCurrentUserId } from "@/shared/utils/discoverCurrentUserId";
import { MechanicInstance } from "../mechanic/mechanics/MechanicInstance";
import { Prisma, type TokenInstance } from "@prisma/client";
import {
    cardsWithId,
    computeInventoryCardIds,
    EQUIPPED_ITEM_ID_FIELDS,
    resolveCardsById,
    uniqueIds,
    type EquippedItemIdField,
} from "../utils/inventoryCards";
import { reconcileEquippedItemPassives } from "../utils/itemPassiveMechanics";
import { reconcileMechanicVisualOverlays } from "../mechanic/utils/reconcileMechanicVisualOverlays";

export class BattleSetter {
    constructor(
        private readonly battleStateRepository = new BattleStateRepository(),
        private readonly pendingQueueRepository = new PendingQueueRepository(),
        private readonly tokenInstanceRepository = new TokenTemplateRepository(),
        private readonly itemRepository = new ItemRepository(),
        private readonly cardRepository = new CardRepository(),
    ) { }

    async addActionHistory({
        battleStateId,
        tokenId,
        choice,
        wasCertainty,
        displayRoll,
    }: AddActionHistoryDTO) {
        const battleState = await this.battleStateRepository.findById(battleStateId);

        if (!battleState) {
            throw new Error(`Batalha com ID ${battleStateId} não foi encontrada.`);
        }

        // Garante que o actionHistory seja tratado como Array
        const currentHistory = Array.isArray(battleState.actionHistory)
            ? (battleState.actionHistory as any[])
            : [];

        const newAction = {
            attribute: choice.attribute,
            type: wasCertainty ? `${choice.type} | DADO CERTO` : choice.type,
            rollResult: displayRoll,
            attackerId: tokenId,
            targetId: choice.targetId,
            round: battleState.round,
        };

        const updatedActionHistory = [...currentHistory, newAction];

        // Atualiza o banco de dados com a nova lista de histórico de ações
        return await this.battleStateRepository.update(battleStateId, {
            actionHistory: updatedActionHistory,
        });
    }

    async addActionHistory_2(
        battleId: string,
        attribute: string,
        type: string,
        rollResult: any,
        dispacherId: string,
        targetId: string,
        round: number
    ) {
        const battleState = await this.battleStateRepository.findById(battleId);

        if (!battleState) {
            throw new Error(`Batalha com ID ${battleId} não foi encontrada.`);
        }

        // Garante que o actionHistory seja tratado como Array
        const currentHistory = Array.isArray(battleState.actionHistory) ? (battleState.actionHistory as any[]) : [];

        const newAction = {
            attribute: attribute,
            type: type,
            rollResult: rollResult,
            attackerId: dispacherId,
            targetId: targetId,
            round: round,
        };

        const updatedActionHistory = [...currentHistory, newAction];

        // Atualiza o banco de dados com a nova lista de histórico de ações
        return await this.battleStateRepository.update(battleId, {
            actionHistory: updatedActionHistory,
        });
    }

    /**
     * Gives a token the first persisted item whose name matches `itemName`.
     * This operation is intentionally limited to a running battle: it exists
     * for mechanics, behaviors and operators that mutate an instance mid-fight.
     *
     * When the backpack is full there is no state mutation and `changed` is
     * false. This makes a lack of space a harmless, explicit no-op as opposed
     * to an exception that could interrupt the mechanic that attempted it.
     */
    async addItemToTokenInventory(
        battleId: string,
        tokenInstanceId: string,
        itemName: string,
    ) {
        const { token } = await this.requireBattleToken(
            battleId,
            tokenInstanceId,
        );
        const item = await this.findExistingItemByName(itemName);
        const capacity = Math.max(
            0,
            token.inventoryDimensionsCols * token.inventoryDimensionsRows,
        );

        if (token.commonSlotIds.length >= capacity) {
            return { token, item, changed: false };
        }

        const updatedToken = await this.persistBattleInventory(
            battleId,
            token,
            this.getEquippedItemIds(token),
            [...token.commonSlotIds, item.id],
        );

        return { token: updatedToken, item, changed: true };
    }

    /**
     * Removes the first item on the token whose persisted item name matches
     * `itemName`. The backpack is inspected in its stored order, then equipped
     * slots in their canonical order. Equipped items are removed directly
     * instead of being moved to the backpack.
     */
    async removeItemFromTokenInventory(
        battleId: string,
        tokenInstanceId: string,
        itemName: string,
    ) {
        const { token } = await this.requireBattleToken(
            battleId,
            tokenInstanceId,
        );
        const normalizedName = this.normalizeItemName(itemName);
        const equippedItemIds = this.getEquippedItemIds(token);
        const orderedItemIds = [
            ...token.commonSlotIds,
            ...EQUIPPED_ITEM_ID_FIELDS.map((field) => equippedItemIds[field]),
        ].filter(Boolean);
        const items = await this.itemRepository.findManyByIds(
            uniqueIds(orderedItemIds),
        );
        const itemById = new Map(items.map((item) => [item.id, item]));

        const commonSlotIndex = token.commonSlotIds.findIndex(
            (itemId) => itemById.get(itemId)?.name === normalizedName,
        );

        if (commonSlotIndex >= 0) {
            const itemId = token.commonSlotIds[commonSlotIndex];
            const item = itemById.get(itemId);

            if (!item) {
                throw new Error("O item encontrado na mochila não existe mais.");
            }

            const updatedToken = await this.persistBattleInventory(
                battleId,
                token,
                equippedItemIds,
                token.commonSlotIds.filter((_, index) => index !== commonSlotIndex),
            );

            return { token: updatedToken, item, changed: true };
        }

        const equippedField = EQUIPPED_ITEM_ID_FIELDS.find(
            (field) => itemById.get(equippedItemIds[field])?.name === normalizedName,
        );

        if (!equippedField) {
            throw new Error(
                `O token não possui nenhum item chamado '${normalizedName}'.`,
            );
        }

        const item = itemById.get(equippedItemIds[equippedField]);
        if (!item) {
            throw new Error("O item equipado encontrado não existe mais.");
        }

        const updatedToken = await this.persistBattleInventory(
            battleId,
            token,
            {
                ...equippedItemIds,
                [equippedField]: "",
            },
            token.commonSlotIds,
        );

        return { token: updatedToken, item, changed: true };
    }

    async tokenDecreaseMana(tokenId: string, usedMana: number) {
        if (usedMana <= 0) return;

        const token = await this.tokenInstanceRepository.findTokenTemplateById(tokenId);

        if (!token) {
            throw new Error(`Token com ID ${tokenId} não foi encontrado.`);
        }

        const currentMana = token.currentMana ?? 0;
        const newMana = Math.max(0, currentMana - usedMana);

        return await this.tokenInstanceRepository.update(tokenId, {
            currentMana: newMana,
        });
    }

    async tokenRecoverMana(tokenId: string, usedActions: number) {

        const token = await this.tokenInstanceRepository.findTokenTemplateById(tokenId)

        if (!token) {
            throw new Error("Não foi possível encontrar o token. Operações não poderão ser feitas.")
        }

        // Calcula taxa de proficiência
        const proficiency = 3 * (Math.floor((((token.level - 10) / 4) + 4) / 2))

        //Total
        const totalRecovering = proficiency * usedActions

        const newMana = Math.min(token.maxMana ?? 0, (token.currentMana ?? 0) + totalRecovering)

        return await this.tokenInstanceRepository.update(tokenId, {
            currentMana: newMana
        })

    }

    /** Adds an explicit amount of mana, capped by the token's maximum mana. */
    async tokenAddMana(tokenId: string, manaIncrement: number) {
        const token = await this.tokenInstanceRepository.findTokenTemplateById(tokenId)

        if (!token) {
            throw new Error("Não foi possível adicionar mana ao token, pois ele não foi encontrado.")
        }

        const newMana = Math.min(
            token.maxMana ?? 0,
            (token.currentMana ?? 0) + manaIncrement,
        )

        return this.tokenInstanceRepository.update(tokenId, {
            currentMana: newMana,
        })
    }

    async tokenAddAction(battleStateId: string, tokenId: string, actionsIncrement: number) {

        const battleState = await this.battleStateRepository.findById(battleStateId)

        if (!battleState) {
            throw new Error("Não foi possível conceder mais ações ao token, pois nenhuma batalha não foi identificada.")
        }

        const token = await this.tokenInstanceRepository.findTokenTemplateById(tokenId)

        if (!token) {
            throw new Error("Não foi possível conceder mais ações ao token, pois ele não foi encontrado.")
        }

        const currentAccumulated = (battleState.accumulatedActions as Record<string, number>) || {};
        const currentActions = currentAccumulated[tokenId] ?? 1;
        const newActions = Math.min(currentActions + actionsIncrement, 5)

        const updatedAccumulatedActions = {
            ...currentAccumulated,
            [tokenId]: newActions,
        };

        return await this.battleStateRepository.update(battleStateId, {
            accumulatedActions: updatedAccumulatedActions,
        });

    }

    async tokenDecreaseAction(battleStateId: string, tokenId: string, usedActions: number = 1) {
        const battleState = await this.battleStateRepository.findById(battleStateId);

        if (!battleState) {
            throw new Error(`Batalha com ID ${battleStateId} não foi encontrada.`);
        }

        const currentAccumulated = (battleState.accumulatedActions as Record<string, number>) || {};
        const currentActions = currentAccumulated[tokenId] ?? 1;
        const remainingActions = Math.max(0, currentActions - usedActions);

        const updatedAccumulatedActions = {
            ...currentAccumulated,
            [tokenId]: remainingActions,
        };

        return await this.battleStateRepository.update(battleStateId, {
            accumulatedActions: updatedAccumulatedActions,
        });
    }

    async tokenSetAction(battleStateId: string, tokenId: string, totalActions: number) {
        const battleState = await this.battleStateRepository.findById(battleStateId)

        if (!battleState) {
            throw new Error("Não foi possível conceder mais ações ao token, pois nenhuma batalha não foi identificada.")
        }

        const token = await this.tokenInstanceRepository.findTokenTemplateById(tokenId)

        if (!token) {
            throw new Error("Não foi possível conceder mais ações ao token, pois ele não foi encontrado.")
        }

        const currentAccumulated = (battleState.accumulatedActions as Record<string, number>) || {};
        const newActions = Math.min(5, totalActions)

        const updatedAccumulatedActions = {
            ...currentAccumulated,
            [tokenId]: newActions,
        };

        return await this.battleStateRepository.update(battleStateId, {
            accumulatedActions: updatedAccumulatedActions,
        });
    }

    async tokenDamage(tokenId: string, damage: number, lastDamagerId: string) {
        const token = await this.tokenInstanceRepository.findTokenTemplateById(tokenId)

        if (!token) {
            throw new Error("Não foi possível aplicar dano ao token, pois ele não foi encontrado.")
        }

        const currentLife = token.currentLife

        if (damage < 0) {
            return
        }

        const newLife = Math.max(0, currentLife - damage)

        return await this.tokenInstanceRepository.update(tokenId, {
            currentLife: newLife,
            lastDamagerId: lastDamagerId
        })
    }

    async tokenAddLife(tokenId: string, lifeIncrement: number) {

        const token = await this.tokenInstanceRepository.findTokenTemplateById(tokenId)

        if (!token) {
            throw new Error("Não foi possível adicionar vida ao token, pois ele não foi encontrado.")
        }

        const currentLife = token.currentLife
        const maxLife = token.maxLife

        const newLife = Math.min(currentLife + lifeIncrement, maxLife)

        return await this.tokenInstanceRepository.update(tokenId, {
            currentLife: newLife
        })

    }

    /** Reduces life without classifying the operation as combat damage. */
    async tokenDecreaseLife(tokenId: string, lifeDecrease: number) {
        const token = await this.tokenInstanceRepository.findTokenTemplateById(tokenId)

        if (!token) {
            throw new Error("Não foi possível reduzir a vida do token, pois ele não foi encontrado.")
        }

        const newLife = Math.max(0, token.currentLife - lifeDecrease)

        return this.tokenInstanceRepository.update(tokenId, {
            currentLife: newLife,
        })
    }

    async tokenDecreaseCertainyDie(tokenId: string) {
        const token = await this.tokenInstanceRepository.findTokenTemplateById(tokenId)

        if (!token) {
            throw new Error("Não foi possível tirar dado certo de token, pois ele não foi encontrado.")
        }

        const certainyDies = token.certaintyDiceRemaining

        const newCertainyDies = Math.max(0, (certainyDies ?? 0) - 1)

        return await this.tokenInstanceRepository.update(tokenId, {
            certaintyDiceRemaining: newCertainyDies
        })
    }

    async tokenDefineStartPosition(tokenId: string) {
        const token = await this.tokenInstanceRepository.findTokenTemplateById(tokenId)

        if (!token) {
            throw new Error("Não foi possível encontrar o token para definir sua posição atual.")
        }

        return await this.tokenInstanceRepository.update(tokenId, {
            startCol: token.col,
            startRow: token.row
        })
    }

    async tokenSetPosition(tokenId: string, newCol: number, newRow: number) {
        const token = await this.tokenInstanceRepository.findTokenTemplateById(tokenId)

        if (!token) {
            throw new Error("Não foi possível encontrar o token para definir sua posição atual.")
        }

        return await this.tokenInstanceRepository.update(tokenId, {
            col: newCol,
            row: newRow
        })
    }

    async addDidActThisTurn(battleStateId: string, tokenId: string, didAct: boolean = true) {
        const battleState = await this.battleStateRepository.findById(battleStateId);

        if (!battleState) {
            throw new Error(`Batalha com ID ${battleStateId} não foi encontrada.`);
        }

        const currentMap = (battleState.didActThisTurn as Record<string, boolean>) || {};

        const updatedDidActThisTurn = {
            ...currentMap,
            [tokenId]: didAct,
        };

        return await this.battleStateRepository.update(battleStateId, {
            didActThisTurn: updatedDidActThisTurn,
        });
    }


    async setDidActThisTurn(battleStateId: string, didActObj: Record<string, boolean>) {
        const battleState = await this.battleStateRepository.findById(battleStateId)

        if (!battleState) {
            throw new Error("Não foi possível encontrar a batalha com o ID forcenido ou não existe batalha.")
        }

        return await this.battleStateRepository.update(battleStateId, {
            didActThisTurn: didActObj
        })
    }

    async removeDidThisActThisTurn(battleStateId: string, tokenId: string) {
        const battleState = await this.battleStateRepository.findById(battleStateId);

        if (!battleState) {
            throw new Error(`Batalha com ID ${battleStateId} não foi encontrada.`);
        }

        const currentMap = (battleState.didActThisTurn as Record<string, boolean>) || {};
        const updatedDidActThisTurn = { ...currentMap };

        delete updatedDidActThisTurn[tokenId];

        return await this.battleStateRepository.update(battleStateId, {
            didActThisTurn: updatedDidActThisTurn,
        });
    }

    async setParalysis(battleStateId: string, tokenId: string, state: string) {
        const battleState = await this.battleStateRepository.findById(battleStateId);

        if (!battleState) {
            throw new Error(`Batalha com ID ${battleStateId} não foi encontrada.`);
        }

        const currentMap = (battleState.tokenParalysis as Record<string, string>) || {};

        const updatedTokenParalysis = {
            ...currentMap,
            [tokenId]: state,
        };

        return await this.battleStateRepository.update(battleStateId, {
            tokenParalysis: updatedTokenParalysis,
        });
    }

    /*
    * Adiciona ou atualiza um bloqueio de ação livre usando qualquer chave (simples ou composta).
    */
    async addFreeActionLock(battleStateId: string, tokenId: string, targetId: string, lockValue: string) {
        const battleState = await this.battleStateRepository.findById(battleStateId);

        if (!battleState) {
            throw new Error(`Batalha com ID ${battleStateId} não foi encontrada.`);
        }

        const currentMap = (battleState.freeActionLock as Record<string, string>) || {};

        const lockKey = `${tokenId}->${targetId}`

        const updatedFreeActionLock = {
            ...currentMap,
            [lockKey]: lockValue,
        };

        return await this.battleStateRepository.update(battleStateId, {
            freeActionLock: updatedFreeActionLock,
        });
    }

    /**
     * Remove o bloqueio de ação livre correspondente à chave fornecida.
     */
    async removeFreeActionLock(battleStateId: string, tokenId: string, targetId: string) {
        const battleState = await this.battleStateRepository.findById(battleStateId);

        if (!battleState) {
            throw new Error(`Batalha com ID ${battleStateId} não foi encontrada.`);
        }

        const currentMap = (battleState.freeActionLock as Record<string, string>) || {};
        const updatedFreeActionLock = { ...currentMap };

        const lockKey = `${tokenId}->${targetId}`

        delete updatedFreeActionLock[lockKey];

        return await this.battleStateRepository.update(battleStateId, {
            freeActionLock: updatedFreeActionLock,
        });
    }

    async setRemainingExtraActions(battleId: string, attackerId: string, extraActions: number) {
        const battleState = await this.battleStateRepository.findById(battleId)

        if (!battleState) {
            throw new Error("Não foi possível encontrar o estado de batalha. Impossível modificar remainingExtraActions.")
        }

        return await this.battleStateRepository.update(battleId, {
            remainingExtraActions: {
                attackerId,
                extraActions
            }
        })
    }

    async cleanRemainingExtraActions(battleId: string) {
        const battleState = await this.battleStateRepository.findById(battleId)

        if (!battleState) {
            throw new Error("Não foi possível encontrar o estado de batalha. Impossível modificar remainingExtraActions.")
        }

        return await this.battleStateRepository.update(battleId, {
            remainingExtraActions: {}
        })
    }

    async setTotalActionsReturn(battleId: string, totalActions: number) {

        const battleState = await this.battleStateRepository.findById(battleId)

        if (!battleState) {
            throw new Error("Não foi possível encontrar o estado de batalha.")
        }

        return await this.battleStateRepository.update(battleId, {
            totalActionsReturn: totalActions
        })
    }

    async addPrevisionAttack(battleId: string, formatedKey: string, numbersActions: number) {
        const battleState = await this.battleStateRepository.findById(battleId)

        if (!battleState) {
            throw new Error("Não foi possível encontrar o estado de batalha.")
        }

        const currentPrevisions = (battleState.previsionActions as Record<string, number>) || {}

        const newPrevision = {
            ...currentPrevisions,
            [formatedKey]: numbersActions
        }

        return await this.battleStateRepository.update(battleId, {
            previsionActions: newPrevision
        })
    }

    async decreasePrevisionAttack(battleId: string, formatedKey: string, numbersActions: number = 1) {
        const battleState = await this.battleStateRepository.findById(battleId);

        if (!battleState) {
            throw new Error("Não foi possível encontrar o estado de batalha.");
        }

        const currentPrevisions = (battleState.previsionActions as Record<string, number>) || {};
        const updatedPrevisions = { ...currentPrevisions };

        if (updatedPrevisions[formatedKey] !== undefined) {
            const newAmount = updatedPrevisions[formatedKey] - numbersActions;

            if (newAmount <= 0) {
                // Remove a chave do registro se o valor for 0 ou negativo
                delete updatedPrevisions[formatedKey];
            } else {
                // Atualiza com a nova quantidade decrementada
                updatedPrevisions[formatedKey] = newAmount;
            }
        }

        return await this.battleStateRepository.update(battleId, {
            previsionActions: updatedPrevisions
        });
    }

    async addPrevReaction(battleId: string, tokenId: string, attribute: string) {

        const battleState = await this.battleStateRepository.findById(battleId)

        if (!battleState) {
            throw new Error("Não foi possível encontrar a batalha.")
        }

        const currentPrevReaction = (battleState.prevReaction as Record<string, string>)

        const newPrevReaction = {
            ...currentPrevReaction,
            [tokenId]: attribute
        }

        return await this.battleStateRepository.update(battleId, {
            prevReaction: newPrevReaction
        })
    }

    async removePrevReaction(battleId: string, tokenId: string) {
        const battleState = await this.battleStateRepository.findById(battleId)

        if (!battleState) {
            throw new Error("Não foi possível encontrar a batalha.")
        }

        const currentPrevReaction = (battleState.prevReaction as Record<string, string>)

        const updatedPrevReaction = currentPrevReaction

        delete updatedPrevReaction[tokenId]

        return await this.battleStateRepository.update(battleId, {
            prevReaction: updatedPrevReaction
        })
    }

    async setLastTurnActed(battleId: string, tokenId: string, value: boolean) {
        const battleState = await this.battleStateRepository.findById(battleId)

        if (!battleState) {
            throw new Error("Não foi possível encontrar a batalha.")
        }

        const currentLastTurnActed = (battleState.lastTurnActed as Record<string, boolean>)

        const newLastTurnActed = {
            ...currentLastTurnActed,
            [tokenId]: value
        }

        return await this.battleStateRepository.update(battleId, {
            lastTurnActed: newLastTurnActed
        })
    }

    async deleteLastTurnActed(battleId: string, tokenId: string) {
        const battleState = await this.battleStateRepository.findById(battleId)

        if (!battleState) {
            throw new Error("Não foi possível encontrar a batalha.")
        }

        const currentPrevReaction = (battleState.lastTurnActed as Record<string, string>)

        const updatedPrevReaction = currentPrevReaction

        delete updatedPrevReaction[tokenId]

        return await this.battleStateRepository.update(battleId, {
            prevReaction: updatedPrevReaction
        })
    }

    async addLastTurnActed(battleId: string, tokenId: string, value: boolean) {
        const battleState = await this.battleStateRepository.findById(battleId)

        if (!battleState) {
            throw new Error("Não foi possível encontrar a batalha com o ID fornecido ou não existe batalha.")
        }

        const lastTurnActed = (battleState.lastTurnActed as Record<string, boolean>)

        const newLastTurnActed = {
            ...lastTurnActed,
            [tokenId]: value
        }

        return await this.battleStateRepository.update(battleId, {
            lastTurnActed: newLastTurnActed
        })
    }

    async addLastTurnMoved(battleId: string, tokenId: string, value: boolean) {
        const battleState = await this.battleStateRepository.findById(battleId)

        if (!battleState) {
            throw new Error("Não foi possível encontrar a batalha com o ID fornecido ou não existe batalha.")
        }

        const lastTurnMoved = (battleState.movedThisTurn as Record<string, boolean>)

        const newLastTurnMoved = {
            ...lastTurnMoved,
            [tokenId]: value
        }

        return await this.battleStateRepository.update(battleId, {
            lastTurnMoved: newLastTurnMoved
        })
    }


    async addMovedThisTurn(battleStateId: string, tokenId: string, value: boolean) {
        const battleState = await this.battleStateRepository.findById(battleStateId)

        if (!battleState) {
            throw new Error("Não foi possível encontrar a batalha com o ID fornecido ou não existe batalha.")
        }

        const movedThisTurn = (battleState.movedThisTurn as Record<string, boolean>)

        const newMovedThisTurn = {
            ...movedThisTurn,
            [tokenId]: value
        }

        return await this.battleStateRepository.update(battleStateId, {
            movedThisTurn: newMovedThisTurn
        })
    }

    async setMovedThisTurn(battleStateId: string, movedObj: Record<string, boolean>) {
        const battleState = await this.battleStateRepository.findById(battleStateId)

        if (!battleState) {
            throw new Error("Não foi possível encontrar a batalha com o ID fornecido ou não existe batalha.")
        }

        return await this.battleStateRepository.update(battleStateId, {
            movedThisTurn: movedObj
        })
    }

    /**
    * Reseta os atributos de vida e mana em tempo de execução de todos os tokens de um mapa.
    */

    async resetTokenBattlePosition(battleId: string) {
        const battleState = await this.battleStateRepository.findById(battleId)

        if (!battleState) {
            throw new Error("Não foi possível encontrar a batalha.")
        }

        return await this.battleStateRepository.update(battleId, {
            tokensBattlePosition: {}
        })
    }

    async resetTokenRuntimeStats(mapId: string) {
        const boardTokens = await this.tokenInstanceRepository.listByMapId(mapId);

        if (!boardTokens || boardTokens.length === 0) {
            return [];
        }

        // Atualiza todos os tokens em paralelo no repositório
        return await Promise.all(
            boardTokens.map((token) =>
                this.tokenInstanceRepository.update(token.id, {
                    currentLife: 1,
                    maxLife: 1,
                    currentMana: 1,
                    maxMana: 1,
                    certaintyDiceRemaining: 0,
                    bonusForca: 0,
                    bonusDestreza: 0,
                    bonusConsistencia: 0,
                    bonusInteligencia: 0,
                    bonusSabedoria: 0,
                    bonusCarisma: 0,
                    tokenEffects: []
                })
            )
        );
    }

    /**
         * Avança para o próximo turno da batalha, validando condições de corrida
         * e incrementando o round se necessário.
         */
    async battleNewTurn(
        battleId: string,
        currentIdx: number,
        nextIdx: number,
        nextTokenId?: string | null
    ) {
        const battleState = await this.battleStateRepository.findById(battleId);

        if (!battleState) {
            throw new Error("Estado de batalha não encontrado.");
        }

        // Evita condição de corrida: garante que ainda estamos no mesmo índice de turno esperado
        if (battleState.currentTurnIndex !== currentIdx) {
            console.log("[HANDLE] ESTADO JÁ FOI ATUALIZADO POR OUTRO FLUXO, IGNORANDO ESTA ETAPA.");
            return battleState;
        }

        const shouldIncrementRound = nextIdx === 0;
        const newRound = shouldIncrementRound ? battleState.round + 1 : battleState.round;
        const newTurnVersion = battleState.turnVersion + 1;

        // PROVISÓRIO
        if(!nextTokenId) {
            throw new Error("Sem próximo token.")
        }

        const nextUserId: string = await discoverCurrentUserId(nextTokenId, battleState.mapId)

        // Persiste a atualização no banco de dados
        const updatedBattle = await this.battleStateRepository.update(battleId, {
            currentTurnIndex: nextIdx,
            currentActorId: nextTokenId || null,
            currentActorUserId: nextUserId,
            round: newRound,
            turnVersion: newTurnVersion,
        });

        return updatedBattle;
    }

    async addLastAllUsedResponse(battleId: string, tokenId: string, value: boolean) {
        const battleState = await this.battleStateRepository.findById(battleId);

        if (!battleState) {
            throw new Error("Estado de batalha não encontrado.");
        }

        const lastAllUsedResponse = (battleState.lastAllUsedResponse as Record<string, boolean>)

        const newLastAllUsedResponse = {
            ...lastAllUsedResponse,
            [tokenId]: value
        }

        return await this.battleStateRepository.update(battleId, {
            lastAllUsedResponse: newLastAllUsedResponse
        })
    }

    async cleanLastAllUsedResponse(battleId: string) {
        const battleState = await this.battleStateRepository.findById(battleId);

        if (!battleState) {
            throw new Error("Estado de batalha não encontrado.");
        }

        return await this.battleStateRepository.update(battleId, {
            lastAllUsedResponse: {}
        })
    }

    async setPostParalyse(battleId: string, responderId: string, forcedId: string, allowedPostAtack: boolean) {
        const battleState = await this.battleStateRepository.findById(battleId)

        if (!battleState) {
            throw new Error("Nenhum battle state foi encontrado.")
        }

        return await this.battleStateRepository.update(battleId, {
            postParalysis: {
                responderId: responderId,
                forcedId: forcedId,
                allowedPostAtack: allowedPostAtack
            }
        })
    }

    async cleanPostParalysis(battleId: string) {
        const battleState = await this.battleStateRepository.findById(battleId)

        if (!battleState) {
            throw new Error("Nenhum battle state foi encontrado.")
        }

        return await this.battleStateRepository.update(battleId, {
            postParalysis: {}
        })
    }

    async decreaseMechanicInstance(battleId: string, mechanicId: string) {

        const battleState = await this.battleStateRepository.findById(battleId)

        if (!battleState) throw new Error("Nenhum battle state foi encontrado.")

        const mechanics = (battleState.activeMechanics as unknown as any[]) ?? []

        const mechanicIndex = mechanics.findIndex((m) => m.id === mechanicId)

        if (mechanicIndex === -1) {
            return
        }

        const mechanic = mechanics[mechanicIndex]
        let updatedMechanics = [...mechanics]

        // Verifica se existe uma duração definida (diferente de undefined/null)
        if (typeof mechanic.duration === "number") {
            const newDuration = mechanic.duration - 1

            if (newDuration <= 0) {
                // 🟢 Remove a mecânica do array se a duração acabou
                const targetId = mechanic.metadata["targetId"]

                if (targetId &&
                    typeof targetId === 'string'
                ) {
                    await this.cleanTokenOverlay(targetId)
                }

                updatedMechanics = mechanics.filter((m) => m.id !== mechanicId)
            } else {
                // 🟢 Atualiza a duração no objeto da mecânica
                updatedMechanics[mechanicIndex] = {
                    ...mechanic,
                    duration: newDuration
                }
            }
        }

        // 🟢 Persiste a lista atualizada no banco de dados
        await this.battleStateRepository.update(battleId, {
            activeMechanics: updatedMechanics as any
        })
    }

    async applyTokenOverlay(tokenId: string, visual: VisualOverlay | null) {


        if (!visual) return
        if (!tokenId) throw new Error("Não foi passada uma string válida para applyTokenOverlay.")

        const token = await this.tokenInstanceRepository.findTokenTemplateById(tokenId)

        if (!token) throw new Error("Não foi possível encontrar Token para applyTokenOverlay.")

        const currentOverlays = Array.isArray(token.visualOverlays)
            ? token.visualOverlays as unknown as VisualOverlay[]
            : []
        const existingIndex = currentOverlays.findIndex(
            (overlay) => overlay.type === visual.type,
        )

        if (existingIndex === -1) {
            return await this.tokenInstanceRepository.update(tokenId, {
                visualOverlays: [...currentOverlays, visual] as unknown as Prisma.InputJsonValue
            })
        }

        const existing = currentOverlays[existingIndex]
        const mechanicInstanceIds = [...new Set([
            ...(existing.mechanicInstanceIds ?? []),
            ...(visual.mechanicInstanceIds ?? []),
        ])]

        if (
            mechanicInstanceIds.length === (existing.mechanicInstanceIds ?? []).length
        ) {
            return token
        }

        const updatedOverlays = [...currentOverlays]
        updatedOverlays[existingIndex] = {
            ...existing,
            mechanicInstanceIds,
        }

        return await this.tokenInstanceRepository.update(tokenId, {
            visualOverlays: updatedOverlays as unknown as Prisma.InputJsonValue
        })


    }

    async cleanTokenOverlay(tokenId: string) {

        if (!tokenId) throw new Error("Não foi passada uma string válida para applyTokenOverlay.")

        const token = await this.tokenInstanceRepository.findTokenTemplateById(tokenId)

        if (!token) throw new Error("Não foi possível encontrar Token para applyTokenOverlay.")

        return await this.tokenInstanceRepository.update(tokenId, {
            visualOverlays: []
        })
    }

    async removeMechanicOverlay(
        tokenId: string,
        mechanicId: string,
        overlayType: string,
    ) {
        const token = await this.tokenInstanceRepository.findTokenTemplateById(tokenId)

        if (!token) {
            throw new Error("Não foi possível encontrar o token do overlay.")
        }

        const currentOverlays = Array.isArray(token.visualOverlays)
            ? token.visualOverlays as unknown as VisualOverlay[]
            : []
        const updatedOverlays = currentOverlays.flatMap((overlay) => {
            if (overlay.type !== overlayType) {
                return [overlay]
            }

            const mechanicInstanceIds = (overlay.mechanicInstanceIds ?? [])
                .filter((id) => id !== mechanicId)

            if (mechanicInstanceIds.length === 0) {
                return []
            }

            return [{
                ...overlay,
                mechanicInstanceIds,
            }]
        })

        if (updatedOverlays.length === currentOverlays.length &&
            updatedOverlays.every((overlay, index) =>
                overlay === currentOverlays[index]
            )
        ) {
            return token
        }

        return this.tokenInstanceRepository.update(tokenId, {
            visualOverlays: updatedOverlays as unknown as Prisma.InputJsonValue,
        })
    }

    async addCardNotRecharged(battleId: string, tokenId: string, cardId: string) {
        // 🟢 1. Validação estrita dos parâmetros de entrada
        if (!battleId || !tokenId || !cardId) {
            throw new Error("Parâmetros 'battleId', 'tokenId' e 'cardId' são obrigatórios.")
        }

        const battleState = await this.battleStateRepository.findById(battleId)

        if (!battleState) {
            throw new Error("Nenhum battle state foi encontrado.")
        }

        // 🟢 2. Trata o campo JSON do banco contra null, undefined ou formato String
        const rawMap = battleState.cardsNotRechargeds
        let currentMap: Record<string, string[]> = {}

        if (rawMap && typeof rawMap === "object" && !Array.isArray(rawMap)) {
            currentMap = { ...(rawMap as Record<string, string[]>) }
        } else if (typeof rawMap === "string") {
            try {
                currentMap = JSON.parse(rawMap)
            } catch {
                currentMap = {}
            }
        }

        // 🟢 3. Obtém o array de cards do tokenId específico (ou inicializa um novo)
        const currentTokenCards = Array.isArray(currentMap[tokenId])
            ? [...currentMap[tokenId]]
            : []

        // 🟢 4. Adiciona o cardId apenas se ele ainda não estiver na lista (evita duplicatas)
        if (!currentTokenCards.includes(cardId)) {
            currentTokenCards.push(cardId)
        }

        const newCardsNotRechargeds = {
            ...currentMap,
            [tokenId]: currentTokenCards
        }

        // 🟢 5. Persiste as alterações no repositório
        return await this.battleStateRepository.update(battleId, {
            cardsNotRechargeds: newCardsNotRechargeds as any
        })
    }

    async removeCardNotRecharged(battleId: string, tokenId: string, cardId: string) {
        // 🟢 1. Validação estrita dos parâmetros de entrada
        if (!battleId || !tokenId || !cardId) {
            throw new Error("Parâmetros 'battleId', 'tokenId' e 'cardId' são obrigatórios.")
        }

        const battleState = await this.battleStateRepository.findById(battleId)

        if (!battleState) {
            throw new Error("Nenhum battle state foi encontrado.")
        }

        // 🟢 2. Trata o campo JSON do banco contra null, undefined ou formato String
        const rawMap = battleState.cardsNotRechargeds
        let currentMap: Record<string, string[]> = {}

        if (rawMap && typeof rawMap === "object" && !Array.isArray(rawMap)) {
            currentMap = { ...(rawMap as Record<string, string[]>) }
        } else if (typeof rawMap === "string") {
            try {
                currentMap = JSON.parse(rawMap)
            } catch {
                currentMap = {}
            }
        }

        // Se o token nem possui uma entrada na lista, não há nada a remover
        if (!Array.isArray(currentMap[tokenId])) {
            return battleState
        }

        // 🟢 3. Filtra a lista removendo o cardId especificado
        const updatedTokenCards = currentMap[tokenId].filter((id) => id !== cardId)

        // 🟢 4. Se a lista de cartas não recarregadas do token zerar, deleta a chave para manter o objeto limpo
        if (updatedTokenCards.length === 0) {
            delete currentMap[tokenId]
        } else {
            currentMap[tokenId] = updatedTokenCards
        }

        // 🟢 5. Persiste as alterações no repositório
        return await this.battleStateRepository.update(battleId, {
            cardsNotRechargeds: currentMap as any
        })
    }

    async addTimeToRechargedCard(
        battleId: string,
        tokenId: string,
        cardId: string,
        recharge: number
    ) {
        // 🟢 1. Validação estrita dos parâmetros de entrada
        if (!battleId || !tokenId || !cardId) {
            throw new Error("Parâmetros 'battleId', 'tokenId' e 'cardId' são obrigatórios.")
        }

        if (typeof recharge !== "number" || isNaN(recharge) || recharge < 0) {
            throw new Error("O valor de 'recharge' deve ser um número válido maior ou igual a zero.")
        }

        const battleState = await this.battleStateRepository.findById(battleId)

        if (!battleState) {
            throw new Error("Nenhum battle state foi encontrado.")
        }

        // 🟢 2. Trata o campo JSON do banco contra null, undefined ou formato String
        const rawMap = battleState.timeToRechargeCard
        let currentMap: Record<string, number> = {}

        if (rawMap && typeof rawMap === "object" && !Array.isArray(rawMap)) {
            currentMap = { ...(rawMap as Record<string, number>) }
        } else if (typeof rawMap === "string") {
            try {
                currentMap = JSON.parse(rawMap)
            } catch {
                currentMap = {}
            }
        }

        const key = `${tokenId}->${cardId}`

        // 🟢 3. Soma o tempo ao valor atual (ou inicializa se não existir)
        const newRecharge = recharge

        const newTimeToRechargeCard = {
            ...currentMap,
            [key]: newRecharge
        }

        // 🟢 4. Persiste no banco com 'as any' para evitar erro do ORM no campo JSON
        return await this.battleStateRepository.update(battleId, {
            timeToRechargeCard: newTimeToRechargeCard as any
        })
    }

    async decreaseTimeToRechargeCard(
        battleId: string,
        tokenId: string,
        cardId: string,
        amount: number = 1
    ) {
        // 🟢 1. Validação estrita dos parâmetros de entrada
        if (!battleId || !tokenId || !cardId) {
            throw new Error("Parâmetros 'battleId', 'tokenId' e 'cardId' são obrigatórios.")
        }

        if (typeof amount !== "number" || isNaN(amount) || amount <= 0) {
            throw new Error("O valor de 'amount' deve ser um número válido maior que zero.")
        }

        const battleState = await this.battleStateRepository.findById(battleId)

        if (!battleState) {
            throw new Error("Nenhum battle state foi encontrado.")
        }

        // 🟢 2. Trata o campo JSON do banco contra null, undefined ou formato String
        const rawMap = battleState.timeToRechargeCard
        let currentMap: Record<string, number> = {}

        if (rawMap && typeof rawMap === "object" && !Array.isArray(rawMap)) {
            currentMap = { ...(rawMap as Record<string, number>) }
        } else if (typeof rawMap === "string") {
            try {
                currentMap = JSON.parse(rawMap)
            } catch {
                currentMap = {}
            }
        }

        const key = `${tokenId}->${cardId}`

        // Se a chave nem existe no mapa, a carta já está recarregada (nada a decrementar)
        if (typeof currentMap[key] !== "number") {
            return battleState
        }

        // 🟢 3. Decrementa o tempo de recarga
        const newRecharge = currentMap[key] - amount

        // 🟢 4. Se a recarga zerou ou ficou negativa, remove a chave para manter o objeto limpo
        if (newRecharge <= 0) {
            delete currentMap[key]
        } else {
            currentMap[key] = newRecharge
        }

        // 🟢 5. Persiste a alteração no banco de dados
        return await this.battleStateRepository.update(battleId, {
            timeToRechargeCard: currentMap as any
        })
    }

    async setMaxSelectablePivots(battleId: string, value: number) {
        if (!battleId) {
            throw new Error("Uma string inválida foi passada como parâmetro para setMaxSelectablePivots.")
        }
        const battleState = await this.battleStateRepository.findById(battleId)

        if (!battleState) throw new Error("O battleState não foi encontrado.")

        return await this.battleStateRepository.update(battleId, {
            maxSelectablePivots: value
        })
    }

    async addSelectedPivot(battleId: string, pivot: PivotCandidate) {
        if (!battleId) {
            // 🟢 Corrigida a mensagem do erro (estava setMaxSelectablePivots)
            throw new Error("Uma string inválida foi passada como parâmetro para addSelectedPivot.")
        }

        const battleState = await this.battleStateRepository.findById(battleId)

        if (!battleState) throw new Error("O battleState não foi encontrado.")

        // 🟢 1. Leitura segura tratando Array ou String JSON
        const rawData = battleState.selectedPivots
        let currentPivots: PivotCandidate[] = []

        if (Array.isArray(rawData)) {
            currentPivots = rawData as unknown as PivotCandidate[]
        } else if (typeof rawData === "string") {
            try {
                const parsed = JSON.parse(rawData)
                if (Array.isArray(parsed)) currentPivots = parsed
            } catch {
                currentPivots = []
            }
        }

        // 🟢 2. CORREÇÃO: Utiliza colchetes [...] para manter como ARRAY
        const updatedPivots = [...currentPivots, pivot]

        // 🟢 3. Persiste o Array atualizado no repositório
        return await this.battleStateRepository.update(battleId, {
            selectedPivots: updatedPivots as any
        })
    }

    async setRemainingPivots(battleId: string, value: number) {
        if (!battleId) {
            throw new Error("Uma string inválida foi passada como parâmetro para setRemainingPivots.")
        }
        const battleState = await this.battleStateRepository.findById(battleId)

        if (!battleState) throw new Error("O battleState não foi encontrado.")

        return await this.battleStateRepository.update(battleId, {
            remainingPivots: value
        })
    }

    async setTokenInOffensiveCard(battleId: string, tokenId: string) {
        if (!battleId || !tokenId) {
            throw new Error("Parâmetros inválidos passados para setTokenInOffensiveCard.")
        }

        const battleState = await this.battleStateRepository.findById(battleId)

        if (!battleState) throw new Error("O battleState não foi encontrado.")

        const token = await this.tokenInstanceRepository.findTokenTemplateById(tokenId)

        if (!token) throw new Error("Não foi encontrado um token para setTokenInOffensiveCard.")

        // 🟢 1. Proteção contra o formato JSON do banco (evita crash se for {})
        const rawTokens = battleState.tokensInOffensiveCard
        const currentTokens = Array.isArray(rawTokens)
            ? (rawTokens as unknown as any[])
            : []

        // 🟢 2. Busca se o token já está no array
        const existingIndex = currentTokens.findIndex((t) => t.id === token.id)

        let newTokens: any[]

        if (existingIndex !== -1) {
            // 🟡 ALTERA: Se já existe, substitui os dados antigos pelos novos
            newTokens = [...currentTokens]
            newTokens[existingIndex] = token
        } else {
            // 🟢 ADICIONA: Se não existe, insere no final da lista
            newTokens = [...currentTokens, token]
        }

        // 🟢 3. Atualiza no banco com 'as any' para ignorar restrição estrita do ORM
        return await this.battleStateRepository.update(battleId, {
            tokensInOffensiveCard: newTokens as any
        })
    }

    async removeTokenInOffensiveCard(battleId: string, tokenId: string) {
        if (!battleId || !tokenId) {
            throw new Error("Parâmetros inválidos passados para removeTokenInOffensiveCard.")
        }

        const battleState = await this.battleStateRepository.findById(battleId)

        if (!battleState) {
            throw new Error("O battleState não foi encontrado.")
        }

        // 🟢 1. Trata com segurança o campo JSON caso ele venha como {} ou null do banco
        const rawTokens = battleState.tokensInOffensiveCard
        const currentTokens = Array.isArray(rawTokens)
            ? (rawTokens as unknown as any[])
            : []

        // 🟢 2. Filtra removendo o token com o id informado
        const updatedTokens = currentTokens.filter((token) => token.id !== tokenId)

        // 🟢 3. Atualiza o estado no repositório ignorando a trava estrita de tipo do ORM
        return await this.battleStateRepository.update(battleId, {
            tokensInOffensiveCard: updatedTokens as any
        })
    }

    async setArmedCard(battleId: string, card: any) {
        if (!battleId) {
            throw new Error("Parâmetros inválidos passados para setArmedCard.")
        }

        const battleState = await this.battleStateRepository.findById(battleId)

        if (!battleState) {
            throw new Error("O battleState não foi encontrado.")
        }

        return await this.battleStateRepository.update(battleId, {
            armedCard: card as any
        })
    }

    async setCardAreUsed(battleId: string, value: boolean) {
        if (!battleId) {
            throw new Error("Parâmetros inválidos passados para setArmedCard.")
        }

        const battleState = await this.battleStateRepository.findById(battleId)

        if (!battleState) {
            throw new Error("O battleState não foi encontrado.")
        }

        return await this.battleStateRepository.update(battleId, {
            cardAreUsed: value
        })
    }

    async addMechanicEntity(
        battleId: string,
        triggerId: string,
        effectsMechanics: string[],
        img: string,
        pivotType: string,
        range: number,
        duration: number,
        col: number,
        row: number
    ): Promise<MechanicEntityInstance> {
        if (!battleId) {
            throw new Error("Não foi passado um battleId válido para addMechanicEntity.")
        }

        const battleState = await this.battleStateRepository.findById(battleId)

        if (!battleState) {
            throw new Error("O battleState não foi encontrado.")
        }

        // 🟢 1. Validação em runtime para garantir que o campo do Prisma seja tratado como Array
        const rawEntities = battleState.mechanicEntitiesInstances
        const currentEntities = Array.isArray(rawEntities)
            ? (rawEntities as unknown as MechanicEntityInstance[])
            : []

        // 🟢 2. Cria a nova entidade com a função auxiliar
        const newEntity = mountMechanicEntity(
            triggerId,
            effectsMechanics,
            img,
            pivotType,
            range,
            duration,
            col,
            row
        )

        const updatedEntities = [...currentEntities, newEntity]

        // 🟢 3. Atualiza no repositório com asserção 'as any' para o campo JSON
        await this.battleStateRepository.update(battleId, {
            mechanicEntitiesInstances: updatedEntities as any
        })

        return newEntity
    }

    async updateMechanicEntity(
        battleId: string,
        entityInstanceId: string,
        data: Partial<MechanicEntityInstance>
    ): Promise<MechanicEntityInstance> {
        if (!battleId || !entityInstanceId) {
            throw new Error("Parâmetros inválidos passados para updateMechanicEntity.")
        }

        const battleState = await this.battleStateRepository.findById(battleId)

        if (!battleState) {
            throw new Error("O battleState não foi encontrado.")
        }

        // 🟢 1. Proteção contra formato JSON do Prisma/ORM
        const rawEntities = battleState.mechanicEntitiesInstances
        const currentEntities = Array.isArray(rawEntities)
            ? (rawEntities as unknown as MechanicEntityInstance[])
            : []

        // 🟢 2. Encontra a posição da entidade na lista
        const entityIndex = currentEntities.findIndex((e) => e.id === entityInstanceId)

        if (entityIndex === -1) {
            throw new Error(`A entidade mecânica com ID '${entityInstanceId}' não foi encontrada.`)
        }

        const updatedEntities = [...currentEntities]
        const currentEntity = updatedEntities[entityIndex]

        // 🟢 3. Mescla os dados antigos com os novos (com deep merge em sub-objetos)
        const updatedEntity: MechanicEntityInstance = {
            ...currentEntity,
            ...data,
            pivotSettings: data.pivotSettings
                ? { ...currentEntity.pivotSettings, ...data.pivotSettings }
                : currentEntity.pivotSettings,
            position: data.position
                ? { ...currentEntity.position, ...data.position }
                : currentEntity.position,
        }

        updatedEntities[entityIndex] = updatedEntity

        // 🟢 4. Persiste a lista atualizada no repositório
        await this.battleStateRepository.update(battleId, {
            mechanicEntitiesInstances: updatedEntities as any
        })

        return updatedEntity
    }

    async removeMechanicEntity(battleId: string, entityInstanceId: string) {
        if (!battleId || !entityInstanceId) {
            throw new Error("Parâmetros inválidos passados para removeMechanicEntity.")
        }

        const battleState = await this.battleStateRepository.findById(battleId)

        if (!battleState) {
            throw new Error("O battleState não foi encontrado.")
        }

        // 🟢 1. Proteção em runtime contra null / {} vindo do banco
        const rawEntities = battleState.mechanicEntitiesInstances
        const currentEntities = Array.isArray(rawEntities)
            ? (rawEntities as unknown as MechanicEntityInstance[])
            : []

        // 🟢 2. Filtra removendo a entidade pelo id da instância
        const updatedEntities = currentEntities.filter((entity) => entity.id !== entityInstanceId)

        // 🟢 3. Persiste a nova lista atualizada
        return await this.battleStateRepository.update(battleId, {
            mechanicEntitiesInstances: updatedEntities as any
        })
    }

    async decreaseMechanicEntityDuration(battleId: string, entityId: string) {
        const battleState = await this.battleStateRepository.findById(battleId)

        if (!battleState) throw new Error("Nenhum battle state foi encontrado.")

        // 🟢 Correção: Lê 'mechanicEntitiesInstances' com validação de Array
        const rawEntities = battleState.mechanicEntitiesInstances
        const entities = Array.isArray(rawEntities)
            ? (rawEntities as unknown as any[])
            : []

        const entityIndex = entities.findIndex((m) => m.id === entityId)

        if (entityIndex === -1) {
            throw new Error("Algo deu errado. Essa entidade não foi encontrada ou não existe.")
        }

        const entity = entities[entityIndex]

        // Se a duração não for numérica (ex: permanente), não precisa atualizar nada
        if (typeof entity.duration !== "number") {
            return
        }

        let updatedEntities = [...entities]
        const newDuration = entity.duration - 1

        if (newDuration <= 0) {
            // 🟢 Remove a entidade da lista quando a duração chega a <= 0
            updatedEntities = entities.filter((e) => e.id !== entityId)
        } else {
            // 🟢 Atualiza a duração da entidade mantendo as demais propriedades
            updatedEntities[entityIndex] = {
                ...entity,
                duration: newDuration
            }
        }

        // 🟢 Persiste no campo correto 'mechanicEntitiesInstances'
        await this.battleStateRepository.update(battleId, {
            mechanicEntitiesInstances: updatedEntities as any
        })
    }

    async setActorUserId(battleId: string, userId: string) {
        const battleState = await this.battleStateRepository.findById(battleId)

        if(!battleState) {
            throw new Error("Estado de batalha não foi encontrado para setActorUserId");
        }

        return await this.battleStateRepository.update(battleId, {
            currentActorUserId: userId
        })
    }

    async setTokenInAmbientPivotSelection(battleId: string, tokenId: string) {
        if (!battleId || !tokenId) {
            throw new Error("Parâmetros inválidos passados para setTokenInAmbientPivotSelection.")
        }

        const battleState = await this.battleStateRepository.findById(battleId)

        if (!battleState) {
            throw new Error("O battleState não foi encontrado.")
        }        

        return await this.battleStateRepository.update(battleId, {
            tokenInAmbientPivotSelection: tokenId
        })
    }

    /** Clears the ambient-pivot owner after its area has been confirmed. */
    async clearTokenInAmbientPivotSelection(battleId: string) {
        if (!battleId) {
            throw new Error("Parâmetro inválido para limpar a seleção de pivot ambiente.");
        }

        const battleState = await this.battleStateRepository.findById(battleId);
        if (!battleState) {
            throw new Error("O battleState não foi encontrado.");
        }

        return await this.battleStateRepository.update(battleId, {
            tokenInAmbientPivotSelection: "",
        });
    }

    private normalizeItemName(itemName: string): string {
        if (typeof itemName !== "string" || !itemName.trim()) {
            throw new Error("O nome do item é obrigatório.");
        }

        return itemName.trim();
    }

    private async findExistingItemByName(itemName: string) {
        const normalizedName = this.normalizeItemName(itemName);
        const item = await this.itemRepository.findFirstByName(normalizedName);

        if (!item) {
            throw new Error(
                `Nenhum item existente chamado '${normalizedName}' foi encontrado.`,
            );
        }

        return item;
    }

    private async requireBattleToken(
        battleId: string,
        tokenInstanceId: string,
    ) {
        if (!battleId || !tokenInstanceId) {
            throw new Error("battleId e tokenInstanceId são obrigatórios.");
        }

        const [battleState, token] = await Promise.all([
            this.battleStateRepository.findById(battleId),
            this.tokenInstanceRepository.findTokenTemplateById(tokenInstanceId),
        ]);

        if (!battleState || battleState.status !== "In Battle") {
            throw new Error("A operação de inventário exige uma batalha em andamento.");
        }

        if (!token || token.mapId !== battleState.mapId) {
            throw new Error("O token não pertence ao mapa da batalha.");
        }

        return { battleState, token };
    }

    private getEquippedItemIds(token: {
        primaryHandId: string;
        offHandId: string;
        neckId: string;
        ringId: string;
        armorId: string;
    }): Record<EquippedItemIdField, string> {
        return {
            primaryHandId: token.primaryHandId,
            offHandId: token.offHandId,
            neckId: token.neckId,
            ringId: token.ringId,
            armorId: token.armorId,
        };
    }

    /**
     * Persists the inventory-derived state that may change when an equipped
     * item is removed: available cards, passive mechanics and mechanic-owned
     * overlays. Publication is intentionally left to the service/operator
     * that requested the mutation, keeping this state layer independent from
     * the synchronization layer.
     */
    private async persistBattleInventory(
        battleId: string,
        token: TokenInstance,
        equippedItemIds: Record<EquippedItemIdField, string>,
        commonSlotIds: string[],
    ) {
        const equippedIds = uniqueIds(
            EQUIPPED_ITEM_ID_FIELDS.map((field) => equippedItemIds[field]),
        );
        const equippedItems = await this.itemRepository.findManyByIds(equippedIds);

        if (equippedItems.length !== equippedIds.length) {
            throw new Error("Um item equipado não pôde ser encontrado.");
        }

        const equipmentCardIds = uniqueIds(
            equippedItems.flatMap((item) => item.cardsIds),
        );
        const equipmentCards = await this.cardRepository.findManyByIds(
            equipmentCardIds,
        );

        if (equipmentCards.length !== equipmentCardIds.length) {
            throw new Error("Um card de item equipado não pôde ser encontrado.");
        }

        const cardIds = computeInventoryCardIds(token.tokenCards, equippedItems);
        const cards = resolveCardsById(cardIds, [
            cardsWithId(token.tokenCards),
            equipmentCards,
        ]);
        let updatedToken = await this.tokenInstanceRepository.update(token.id, {
            ...equippedItemIds,
            commonSlotIds,
            cards: JSON.parse(JSON.stringify(cards)) as Prisma.InputJsonValue,
        });

        const battleState = await this.battleStateRepository.findById(battleId);
        if (!battleState || battleState.status !== "In Battle") {
            throw new Error("A batalha foi encerrada durante a atualização do inventário.");
        }

        const previousMechanics = Array.isArray(battleState.activeMechanics)
            ? battleState.activeMechanics as unknown as MechanicInstance[]
            : [];
        const updatedBattleState = await this.updateActiveMechanics(
            battleId,
            (activeMechanics) => reconcileEquippedItemPassives(
                activeMechanics,
                token.id,
                equippedItems,
            ),
        );
        const activeMechanics = Array.isArray(updatedBattleState.activeMechanics)
            ? updatedBattleState.activeMechanics as unknown as MechanicInstance[]
            : [];
        const currentOverlays = Array.isArray(updatedToken.visualOverlays)
            ? updatedToken.visualOverlays as unknown as VisualOverlay[]
            : [];
        const synchronizedOverlays = reconcileMechanicVisualOverlays(
            currentOverlays,
            previousMechanics,
            activeMechanics,
            token.id,
        );

        if (JSON.stringify(synchronizedOverlays) !== JSON.stringify(currentOverlays)) {
            updatedToken = await this.tokenInstanceRepository.update(token.id, {
                visualOverlays:
                    synchronizedOverlays as unknown as Prisma.InputJsonValue,
            });
        }

        return updatedToken;
    }

    /**
     * Updates the mechanic collection using its most recent persisted value.
     * Serializable isolation prevents concurrent mechanic operations from
     * silently replacing one another.
     */
    async updateActiveMechanics(
        battleId: string,
        update: (
            current: readonly MechanicInstance[],
        ) => readonly MechanicInstance[],
    ) {
        const maximumAttempts = 3;

        for (let attempt = 0; attempt < maximumAttempts; attempt += 1) {
            try {
                return await this.battleStateRepository.updateActiveMechanics(
                    battleId,
                    (persistedMechanics) => {
                        const activeMechanics: MechanicInstance[] =
                            Array.isArray(persistedMechanics)
                                ? persistedMechanics as unknown as MechanicInstance[]
                                : [];
                        const currentMechanics = structuredClone(activeMechanics);
                        const updatedMechanics = update(currentMechanics);

                        return [...updatedMechanics] as unknown as Prisma.InputJsonValue;
                    },
                );
            } catch (error) {
                const isSerializationConflict =
                    error instanceof Prisma.PrismaClientKnownRequestError &&
                    error.code === "P2034";

                if (!isSerializationConflict || attempt === maximumAttempts - 1) {
                    throw error;
                }
            }
        }

        throw new Error("Não foi possível atualizar as mecânicas ativas.");
    }

    /**
     * Replaces one active mechanic while preserving its identity.
     */
    async updateMechanicInstance(
        battleId: string,
        mechanicId: string,
        update: (current: Readonly<MechanicInstance>) => MechanicInstance,
    ) {
        return this.updateActiveMechanics(battleId, (activeMechanics) => {
            const mechanicIndex = activeMechanics.findIndex(
                (activeMechanic) => activeMechanic.id === mechanicId,
            );

            if (mechanicIndex === -1) {
                throw new Error(
                    `MechanicInstance com ID ${mechanicId} não foi encontrada na batalha.`,
                );
            }

            const updatedMechanic = update(activeMechanics[mechanicIndex]);

            if (updatedMechanic.id !== mechanicId) {
                throw new Error(
                    "A atualização não pode alterar o ID da MechanicInstance.",
                );
            }

            const updatedMechanics = [...activeMechanics];
            updatedMechanics[mechanicIndex] = updatedMechanic;

            return updatedMechanics;
        });
    }

    async removeMechanicInstances(
        battleId: string,
        selection: Set<string> | ((mechanic: Readonly<MechanicInstance>) => boolean),
    ) {
        const predicate = selection instanceof Set
            ? (mechanic: Readonly<MechanicInstance>) => selection.has(mechanic.id)
            : selection;

        return this.updateActiveMechanics(
            battleId,
            (activeMechanics) => activeMechanics.filter(
                (mechanic) => !predicate(mechanic),
            ),
        );
    }

    async removeMechanicInstance(battleId: string, mechanicId: string) {
        return this.removeMechanicInstances(
            battleId,
            (mechanic) => mechanic.id === mechanicId,
        );
    }

}
