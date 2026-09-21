import { initializeBattleStats } from "../utils/calculations";
import { rollInitiative } from "../utils/calculations";
import { Prisma, type TokenInstance } from "@prisma/client";

import { runtime } from "@/runtime";
import { SocketEvent } from "@/runtime/Events";
import { BattleStateValidator } from "@/modules/battles/validators/BattleStateCreateValidator";
import { discoverCurrentUserId } from "@/shared/utils/discoverCurrentUserId";
import { BattleEngineService } from "./BattleEngineService";
import { EQUIPPED_ITEM_ID_FIELDS, uniqueIds } from "../utils/inventoryCards";
import { reconcileEquippedItemPassives } from "../utils/itemPassiveMechanics";
import type { MechanicInstance } from "../mechanic/mechanics/MechanicInstance";
import type { VisualOverlay } from "../mechanic/types/visualOverlays";
import { reconcileMechanicVisualOverlays } from "../mechanic/utils/reconcileMechanicVisualOverlays";

interface InitiativeData {
    tokenId: string;
    initiative: number;
    hasExtraTurn: boolean;
}

export class BattleEngineStartBattleService extends BattleEngineService {
    async execute(mapId: string, userId: string) {

        const map = await this.mapRepository.findMapById(mapId)

        if (!map) {
            throw new Error("Mapa inexistente. Não foi possível iniciar a batalha.")
        }

        const campaign = await this.campaignRepository.findCampaignById(map.campaignId);

        if (!campaign) {
            throw new Error("Campanha do mapa não encontrada.");
        }

        if (campaign.ownerId !== userId) {
            throw new Error("Apenas o mestre da campanha pode iniciar uma batalha.");
        }

        const existingBattle = await this.battleStateRepository.findByMapId(mapId);
        if (existingBattle) {
            throw new Error("Já existe uma batalha neste mapa.");
        }

        const boardTokens = await this.tokenInstanceRepository.listByMapId(mapId)

        if (!boardTokens) {
            throw new Error("Não existem boardTokens")
        }

        const teams = new Set(boardTokens.map((t) => t.team));
        if (teams.size < 2 || boardTokens.length < 2) {
            throw new Error("Não será possível iniciar uma batalha, pois não existem times suficientes.")
        }

        const initialized = boardTokens.map(initializeBattleStats)

        const attributeTableInit: Record<string, Record<string, number>> = {};

        initialized.forEach(t => {
            attributeTableInit[t.id] = {
                forca: 0,
                destreza: 0,
                consistencia: 0,
                inteligencia: 0,
                sabedoria: 0,
                carisma: 0
            };
        });

        for (const token of initialized) {
            await this.tokenInstanceRepository.update(token.id, token)
            runtime.emit(SocketEvent.TOKEN_UPDATED, token)
        }


        const inits: InitiativeData[] = initialized.map((token) => ({
            tokenId: token.id,
            initiative: rollInitiative(
                token.destreza,
                token.bonusDestreza,
                token.level
            ),
            hasExtraTurn: false,
        }));
        inits.sort((a, b) => b.initiative - a.initiative);
        if (inits[0]) inits[0].hasExtraTurn = true;

        const acc: Record<string, number> = {};
        const didActObj: Record<string, boolean> = {};
        const movedObj: Record<string, boolean> = {};

        inits.forEach((i, idx) => {
            acc[i.tokenId] = idx === 0 ? 2 : 1;
            didActObj[i.tokenId] = false;
            movedObj[i.tokenId] = false;
        });

        Object.keys(acc).forEach((id) => {
            acc[id] = Math.max(1, Math.min(5, acc[id]));
        });

        const firstId = inits[0]?.tokenId;



        if (firstId) {
            const targetToken = initialized.find(t => t.id === firstId);

            if (targetToken) {
                await this.tokenInstanceRepository.update(firstId, {
                    startCol: targetToken.col,
                    startRow: targetToken.row,
                });
                runtime.emit(SocketEvent.TOKEN_UPDATED, targetToken)
            }
        }

        for (const t of initialized) {
            await this.tokenInstanceRepository.update(t.id, {
                certaintyDiceRemaining: 2, // Define os 2 dados por batalha diretamente
            });
            runtime.emit(SocketEvent.TOKEN_UPDATED, t)
        }

        const lastAct: Record<string, boolean> = {};
        const lastMove: Record<string, boolean> = {};
        inits.forEach(i => {
            lastAct[i.tokenId] = false;
            lastMove[i.tokenId] = false;
        });
        //this.context.setLastTurnActed(lastAct);
        //this.context.setLastTurnMoved(lastMove);

        //this.context.hasEnteredFirstTurnRef.current = {};

        /*
        
        export interface BattleState {
          id: string,
          status: BattleStatus;
          round: number;
          turnOrder: InitiativeData[];
          currentTurnIndex: number;
          currentActorId: string | null;
          phase: string;
          locks: BattleLocks;
          accumulatedActions: Record<string, number>;
          activeEffects: Record<string, TurnEffect[]>;
          actionHistory: ActionChoice[];
          isReallocatingTurns: boolean;
          isAIActing: boolean;
          turnVersion: number;
          previsionActions: Record<string, number>;
          mapId: string;
          tokensInOffensiveCard: Token[],
          maxSelectablePivots: number,
          remainingPivots: number
        }

        */

        const userCurrentId: string = await discoverCurrentUserId(firstId, mapId)

        console.log("CURRENT USER: ", userCurrentId);

        const mountBattleState = {
            id: crypto.randomUUID(),
            status: "In Battle",
            round: 1,
            turnOrder: inits,
            currentTurnIndex: 0,
            currentActorId: firstId,
            currentActorUserId: userCurrentId,
            phase: "Initiative",
            locks: { aiActing: false, reallocating: false, resolvingAction: false },
            accumulatedActions: acc,
            activeEffects: {},
            actionHistory: [],
            isReallocatingTurns: false,
            isAIActing: false,
            turnVersion: 1,
            mapId: mapId,
            pendingQueueId: "",
            previsionActions: {},
            tokensInOffensiveCard: [],
            maxSelectablePivots: 0,
            remainingPivots: 0

        }

        const battleState = BattleStateValidator.parse(mountBattleState)

        const createdBattleState = await this.battleStateRepository.create(battleState)

        await this.instantiateEquippedItemPassives(createdBattleState.id, initialized)

        const battleStateWithPassives = await this.battleStateRepository.findById(
            createdBattleState.id,
        )

        if (battleStateWithPassives) {
            await this.synchronizeInitialMechanicVisuals(
                initialized,
                battleStateWithPassives.activeMechanics,
            );
        }

        runtime.emit(SocketEvent.BATTLE_STARTED, battleStateWithPassives ?? createdBattleState)

        await this.battleSetter.setDidActThisTurn(mountBattleState.id, didActObj)
        await this.battleSetter.setMovedThisTurn(mountBattleState.id, movedObj)
        /*if (boardBoss) {
            this.context.setIntroductionAnimation(true);
        } */

    };

    /**
     * Establishes the initial item passives. The same reconciliation rule is
     * used by inventory swaps while this battle remains active.
     */
    private async instantiateEquippedItemPassives(
        battleId: string,
        tokens: readonly TokenInstance[],
    ) {
        const itemIds = uniqueIds(tokens.flatMap((token) =>
            EQUIPPED_ITEM_ID_FIELDS.map((field) => token[field]),
        ));
        const items = await this.itemRepository.findManyByIds(itemIds);
        const itemsById = new Map(items.map((item) => [item.id, item]));

        await this.battleSetter.updateActiveMechanics(
            battleId,
            (activeMechanics) => tokens.reduce((mechanics, token) => {
                const equippedItems = uniqueIds(
                    EQUIPPED_ITEM_ID_FIELDS.map((field) => token[field]),
                ).map((itemId) => {
                    const item = itemsById.get(itemId);

                    if (!item) {
                        throw new Error(
                            `O item equipado "${itemId}" não foi encontrado.`,
                        );
                    }

                    return item;
                });

                return reconcileEquippedItemPassives(
                    mechanics,
                    token.id,
                    equippedItems,
                );
            }, [...activeMechanics]),
        );
    }

    private async synchronizeInitialMechanicVisuals(
        tokens: readonly TokenInstance[],
        rawActiveMechanics: unknown,
    ) {
        const activeMechanics = Array.isArray(rawActiveMechanics)
            ? rawActiveMechanics as MechanicInstance[]
            : [];

        for (const token of tokens) {
            const persistedToken =
                await this.tokenInstanceRepository.findTokenTemplateById(token.id);

            if (!persistedToken) {
                continue;
            }

            const currentOverlays = Array.isArray(persistedToken.visualOverlays)
                ? persistedToken.visualOverlays as unknown as VisualOverlay[]
                : [];
            const synchronizedOverlays = reconcileMechanicVisualOverlays(
                currentOverlays,
                [],
                activeMechanics,
                token.id,
            );

            if (
                JSON.stringify(synchronizedOverlays) === JSON.stringify(currentOverlays)
            ) {
                continue;
            }

            const updatedToken = await this.tokenInstanceRepository.update(token.id, {
                visualOverlays:
                    synchronizedOverlays as unknown as Prisma.InputJsonValue,
            });

            runtime.emit(SocketEvent.TOKEN_UPDATED, updatedToken);
        }
    }
}
