import { ChoiceValidator } from "../validators/ChoiceValidator";

import { grantFreeActionNoReaction } from "../context/auxiliary/battleFunctions";
import { isInAttackRange } from "../utils/calculations";
import { calculateCertainyDieRoll } from "../utils/calculations";
import { itemCoerentAdd } from "../context/auxiliary/battleFunctions";
import { defineRemainingPrevisionAttacks } from "../context/auxiliary/battleFunctions";

import { runtime } from "@/runtime";
import { SocketEvent } from "@/runtime/Events";
import { BattleStateValidator } from "@/modules/battles/validators/BattleStateCreateValidator";
import { syncBattleState } from "../utils/syncBattleState";
import { BattleEngineNextTurnService } from "./micro-services/BattleEngineNextTurnService";
import { MechanicEngine } from "../mechanic/MechanicEngine";
import { OperatorType } from "../operators/OperatorType";
import { BattleEngineService } from "./BattleEngineService";
import { attackTypeFromAttribute } from "../utils/attackType";
import { getUsedItemId } from "../utils/usedItem";

export class BattleEngineReactionService extends BattleEngineService {
    private readonly battleEngineNextTurnService = new BattleEngineNextTurnService();

    async execute(battleId: string, data: unknown) {

        if (!battleId) {
            throw new Error("O id da batalha não foi passado!")
        }

        const battleState = await this.battleStateRepository.findById(battleId)

        if (!battleState || !battleState.pendingQueueId) {
            throw new Error("Estado de batalha não encontrado ou sem fila associada.");
        }

        const battle = BattleStateValidator.parse(battleState)

        if (!battle.id) {
            throw new Error("A batalha não possui ID.")
        }

        const pendingQueue = await this.pendingQueueRepository.findByBattleStateId(battleId)

        if (!pendingQueue) {
            throw new Error("Não foi possível encontrar uma fila ou não foi instânciada ainda.")
        }

        //Pendencias e Dependencias
        const pendingAttack = await this.pendingGetter.getPendingAttack(pendingQueue.id)
        const remainingExtraActions = await this.battleGetter.getRemainingExtraActions(battleId)


        if (!pendingAttack) {
            throw new Error("Impossível resgatar Pending Attack")
        }

        //Token no tabuleiro
        const boardTokens = await this.tokenInstanceRepository.listByMapId(battleState.mapId)

        if (!boardTokens) {
            throw new Error("Não será possível executar essa ação devido que os tokens no tabuleiro não foram encontrados.")
        }

        if (battleState.status !== "In Battle") {
            throw new Error("A batalha não será iniciada, pois não está setada como 'In Battle'.")
        };

        const attackerId = pendingAttack.attackerId;
        const defenderId = pendingAttack.targetId;

        const attackerToken = boardTokens.find(t => t.id === attackerId);
        const defenderToken = boardTokens.find(t => t.id === defenderId);

        if (!attackerToken) {
            throw new Error("Token Atacante não foi encontrado para reação")
        }

        if (!defenderToken) {
            throw new Error("Token Defensor não foi encontrado para reação.")
        };

        // Id's dos usuários


        //Escolhas de parâmetros da reação
        const choice = ChoiceValidator.parse(data)
        const reactionType = (choice["reactionType"] as string)

        const usedMana = (choice["usedMana"] as number)
        const usedActions = (choice["usedActions"] as number)

        if (reactionType === "card" && defenderToken) {
            console.debug("Chegando aqui: ", defenderToken.name)
            //handleDefenseCardResolution(defenderToken);
            await this.handleEndReaction(pendingQueue.id)
            await syncBattleState(battleId)
            return;
        }

        // Saneamento de custos do defensor
        const availableActionsDef = battle.accumulatedActions[defenderId] ?? 1;
        const usedActionsClamped = Math.max(1, Math.min(usedActions ?? 1, availableActionsDef));
        const usedManaClamped = Math.min(usedMana ?? 0, defenderToken.currentMana ?? 0);

        // Calcular giro do dado
        const proficiency = await this.battleGetter.getTokenProficiency(defenderId, choice.attribute ?? "")

        const params = {
            tokenId: defenderId,
            usedItemId: getUsedItemId(choice["usedItem"]),
            Q: usedActions,
            P: 1, // ?
            A: await this.battleGetter.getTokenAttributeValue(defenderId, reactionType),
            PF: proficiency,
            O: (await this.battleGetter.getTokenBonus(defenderId, reactionType)) + itemCoerentAdd(reactionType, choice["usedItem"]),
            N: usedMana > 0 ? 1 : 0,
            L: defenderToken.level,
            M: usedMana,
        };

        const roll = await this.resolveActionRoll(
            battleId,
            params,
            "REACTION_ROLL",
            {
                reactionType,
                opponentTokenId: attackerId,
                targetTokenId: defenderId,
            },
        );

        // A rolagem precisa ser autorizada antes que a reação consuma recursos.
        if (usedManaClamped > 0) {
            await this.operators.execute(OperatorType.MANA_DECREASE, {
                battleId,
                sourceTokenId: defenderId,
                amount: usedManaClamped,
                cause: "REACTION_MANA_COST",
                metadata: { reactionType },
            })
        }
        await this.battleSetter.addDidActThisTurn(battleId, defenderId, true)
        await this.battleSetter.tokenDecreaseAction(battleId, defenderId, usedActionsClamped)

        // Caso especial: Dado Certo na reação então: imunidade imediata
        if (choice["usedCertaintyDie"]) {

            // Consome 1 carga de Dado Certo do defensor
            await this.battleSetter.tokenDecreaseCertainyDie(defenderId)

            const { displayRoll } = calculateCertainyDieRoll(roll, usedActionsClamped);

            // Histórico da reação com Dado Certo
            await this.battleSetter.addActionHistory({
                battleStateId: battleId,
                tokenId: defenderId,
                choice: choice,
                wasCertainty: true,
                displayRoll: displayRoll,
            })

            await this.handleEndReaction(pendingQueue.id)

            // Avança o turno do atacante se ele já não tiver ações
            const attackerActions = battle.accumulatedActions[attackerId] ?? 1;
            console.log("ATACCKER ID: ", attackerActions);
            if (attackerActions <= 0) {
                await this.battleEngineNextTurnService.execute(battleId)
            }

            await syncBattleState(battleId)
            return;
        }
        else if (reactionType === "inteligencia" && pendingAttack.attackAttribute === "inteligencia") {
            if (!pendingAttack) return;
            console.log("PENDING ATTACK: ", pendingAttack.attackRoll)
            console.log("ROLL TOTAL: ", roll.total)

            //Previsões
            if (pendingAttack.attackRoll > roll.total) {
                console.log("[PREVISION] Chegou aqui para definir prevision")
                defineRemainingPrevisionAttacks(
                    this.battleSetter,
                    battleId,
                    attackerId,
                    defenderId,
                    1
                )
            }
            else if (roll.total > pendingAttack.attackRoll) {
                defineRemainingPrevisionAttacks(
                    this.battleSetter,
                    battleId,
                    defenderId,
                    attackerId,
                    1
                )
            }

            // Histórico
            await this.battleSetter.addActionHistory({
                battleStateId: battleId,
                tokenId: defenderId,
                choice: choice,
                wasCertainty: false,
                displayRoll: roll,
            })

            await this.handleEndReaction(pendingQueue.id)

            const attackerActions = battle.accumulatedActions[attackerId] ?? 1;

            if (attackerActions <= 0) {
                await this.battleEngineNextTurnService.execute(battleId)
            }

            await syncBattleState(battleId)
            return;
        }
        else if (reactionType === "sabedoria" && pendingAttack.attackAttribute === "sabedoria") {
            if (roll.total > pendingAttack.attackRoll) {

                await this.battleSetter.tokenSetAction(battleId, defenderId, battle.accumulatedActions[defenderId] + battle.accumulatedActions[attackerId])
                await this.battleSetter.tokenSetAction(battleId, attackerId, 1)

                const token = boardTokens.find(t => t.id === defenderId);
                const targetToken = boardTokens.find(t => t.id === attackerId);

                if (!token || !targetToken) {
                    console.warn("Token ou targetToken não encontrado");
                    await syncBattleState(battleId)
                    return;
                }

                if (isInAttackRange(token, targetToken, 'fisico')) {
                    await grantFreeActionNoReaction(
                        this.battleSetter,
                        this.pendingSetter,
                        battleId,
                        pendingQueue.id,
                        defenderId,
                        attackerId,
                        "paralisia",
                        1
                    )
                }

            }
            else if (roll.total < pendingAttack.attackRoll) {
                await this.battleSetter.tokenSetAction(battleId, attackerId, battle.accumulatedActions[defenderId] + battle.accumulatedActions[attackerId])
                await this.battleSetter.tokenSetAction(battleId, defenderId, 1)

                const token = boardTokens.find(t => t.id === attackerId);
                const targetToken = boardTokens.find(t => t.id === defenderId);

                if (!token || !targetToken) {
                    console.warn("Token ou targetToken não encontrado");
                    return; // interrompe para evitar erro
                }

                if (isInAttackRange(token, targetToken, 'fisico')) {
                    await grantFreeActionNoReaction(
                        this.battleSetter,
                        this.pendingSetter,
                        battleId,
                        pendingQueue.id,
                        attackerId,
                        defenderId,
                        "paralisia",
                        1
                    )
                }
            }

            await this.battleSetter.addActionHistory({
                battleStateId: battleId,
                tokenId: defenderId,
                choice: choice,
                wasCertainty: false,
                displayRoll: roll,
            })

            await this.handleEndReaction(pendingQueue.id)

            const attackerActions = battle.accumulatedActions[attackerId] ?? 1;
            console.log("ATACCKER ID: ", attackerActions);
            if (attackerActions <= 0) {
                await this.battleEngineNextTurnService.execute(battleId)
            }

            await syncBattleState(battleId)
            return;
        }
        else if (reactionType === "destreza" && pendingAttack.attackAttribute === "destreza") {
            if (roll.total > pendingAttack.attackRoll) {
                await grantFreeActionNoReaction(
                    this.battleSetter,
                    this.pendingSetter,
                    battleId,
                    pendingQueue.id,
                    defenderId,
                    attackerId,
                    "paralisia",
                    1
                )
            }
            else if (roll.total < pendingAttack.attackRoll) {
                await grantFreeActionNoReaction(
                    this.battleSetter,
                    this.pendingSetter,
                    battleId,
                    pendingQueue.id,
                    attackerId,
                    defenderId,
                    "paralisia",
                    3
                )
            }

            await this.battleSetter.addActionHistory({
                battleStateId: battleId,
                tokenId: defenderId,
                choice: choice,
                wasCertainty: false,
                displayRoll: roll,
            })

            await this.handleEndReaction(pendingQueue.id)
            await syncBattleState(battleId)
        }
        else if (reactionType === "destreza") {
            // Esquiva binária: guarda rolagem do defensor e vai para resolução com rolagem de definição do atacante
            await this.pendingSetter.setPendingEsquivaRoll(
                pendingQueue.id,
                roll.rawRolls,
                roll.total,
                roll.usedMana,
                roll.CRI
            )
            runtime.emit(SocketEvent.PENDING_ESQUIVA_ROLL, roll)

            await this.battleSetter.addPrevReaction(battleId, defenderId, "destreza")

            await this.battleSetter.addActionHistory({
                battleStateId: battleId,
                tokenId: defenderId,
                choice: choice,
                wasCertainty: false,
                displayRoll: roll,
            })

            // Ativa UI de resolução (definição do atacante)
            runtime.emit(SocketEvent.FRONTEND_IN_DEFENSE_RESOLUTION, true)
            await syncBattleState(battleId)
            return;
        }
        else if (reactionType === "consistencia") {


            if (
                pendingAttack
                && pendingAttack.attackAttribute === 'forca'
                && roll.total > pendingAttack.attackRoll
            ) {

                await grantFreeActionNoReaction(
                    this.battleSetter,
                    this.pendingSetter,
                    battleId,
                    pendingQueue.id,
                    defenderId,
                    attackerId,
                    "paralisia",
                    1
                )
            }

            if (!pendingAttack) {
                await syncBattleState(battleId)
                return
            }

            await this.battleSetter.addPrevReaction(battleId, defenderId, "consistência")

            const reduction = Math.max(0, roll.total);
            const mitigatedRoll = Math.max(0, pendingAttack.attackRoll - reduction);
            const finalDamage = Math.max(0, Math.min(pendingAttack.rawDamage, mitigatedRoll));

            // Histórico da defesa
            await this.battleSetter.addActionHistory({
                battleStateId: battleId,
                tokenId: defenderId,
                choice: choice,
                wasCertainty: false,
                displayRoll: roll,
            })

            // Aplica dano restante no defensor


            if (finalDamage > 0) {


                // Aplica efeito via Mechanics
                if (defenderToken) {
                    await MechanicEngine.createMechanic(
                        attackerId,
                        battleId,
                        pendingAttack.atackElement, {
                        targetId: defenderId
                    })
                };

                //spawnItemVFX(attackerId, defenderId, (pendingAttack.usedItem === null ? undefined : pendingAttack.usedItem), boardTokens, setBoardVfxElements, playSomeSFX)
                //playSomeSFX("public/sfx/impact.mp3");
                await this.operators.execute(OperatorType.DAMAGE, {
                    battleId,
                    sourceTokenId: attackerId,
                    targetTokenId: defenderId,
                    amount: finalDamage,
                    element: pendingAttack.atackElement,
                    metadata: {
                        attackType: attackTypeFromAttribute(pendingAttack.attackAttribute),
                        attackAttribute: pendingAttack.attackAttribute,
                    },
                })

                if (pendingAttack.usedMana > 0) {

                    await grantFreeActionNoReaction(
                        this.battleSetter,
                        this.pendingSetter,
                        battleId,
                        pendingQueue.id,
                        attackerId,
                        defenderId,
                        "paralisia_rapida",
                        1
                    )
                }
            }

            // Limpeza do ataque corrente
            console.log("CHEGOU NO FINAL DE REAÇÂO")
            await this.handleEndReaction(pendingQueue.id)
            // Avança turno do atacante se sem ações
            const attackerActions = battle.accumulatedActions[attackerId] ?? 1;
            const isDefensesEqualAtack = pendingAttack.rawDamage === reduction;
            if (attackerActions <= 0 && (remainingExtraActions.extraActions ?? 0) <= 0 && (isDefensesEqualAtack || pendingAttack.usedMana === 0)) {
                await this.battleEngineNextTurnService.execute(battleId)
            }

            await syncBattleState(battleId)
            return;
        }
    }

    private async handleEndReaction(pendingQueueId: string) {

        await this.pendingSetter.cleanPendingAttack(pendingQueueId)
        await this.pendingSetter.cleanPendingEsquivaRoll(pendingQueueId)

        runtime.emit(SocketEvent.PENDING_ATTACK, null)
        runtime.emit(SocketEvent.PENDING_ESQUIVA_ROLL, null)
        runtime.emit(SocketEvent.FRONTEND_IN_DEFENSE_RESOLUTION, false)
    }
}
