import { calculateCardRoll } from "../../utils/calculations";
import { sum } from "../../utils/calculations";
import { ActionRollParams } from "../../utils/calculations";

import { runtime } from "@/runtime";
import { SocketEvent } from "@/runtime/Events";
import { MechanicEngine } from "../../mechanic/MechanicEngine";
import { syncBattleState } from "../../utils/syncBattleState";
import { OperatorType } from "../../operators/OperatorType";
import { BattleEngineService } from "../BattleEngineService";

export class BattleEngineTreatTargetService extends BattleEngineService {

    async execute(
        battleId: string,
        triggerTokenId: string,
        target: any,
        card: any,
        options: { consumeCardCosts?: boolean } = {},
    ) {

        if (!battleId) throw new Error("Não foi passada uma string válida para battleId")

        const battleState = await this.battleStateRepository.findById(battleId)

        if (!battleState) throw new Error("Não existe batalha rolando ou não foi possível encontrar")

        const boardTokens = await this.tokenInstanceRepository.listByMapId(battleState.mapId)

        if (!boardTokens) throw new Error("Não existem ou não foram encontrados os boardTokens.")

        const triggerToken = await this.tokenInstanceRepository.findTokenTemplateById(triggerTokenId)

        if (!triggerToken) throw new Error("Não foi possível encontrar o trigger token.")

        const tokenProficiency = Math.ceil((triggerToken.level - 10) / 4 + 4)

        if (!target) {
            return 0;
        }

        const type = target.type;

        const waitToApplyEffect = (card.causalityType === "Offensive") ? true : false;


        if (type === "Self" || type === "Target") {
            target.numbersTarget = 1;
        }

        if (type === "Self") {
            target.tokenTarget = [triggerToken];
        }

        if (!target.tokenTarget || target.tokenTarget.length === 0) return 0;

        const affectedTargets = target.tokenTarget.slice(
            0,
            target.numbersTarget ?? 1
        );

        const roll = calculateCardRoll(1, triggerToken, card);
        const rollScore = (sum(roll.rawRolls) + roll.total) * roll.CRI;

        const classAtributeConjure: Record<string, string> =
        {
            Guerreiro: "consistencia",
            Mago: "sabedoria",
            Ladino: "destreza",
            Bárbaro: "forca",
            Feitiçeiro: "inteligencia",
        }

        const searchAtributeConjureProficiency: Record<string, string> =
        {
            Guerreiro: "consistencia",
            Mago: "sabedoria",
            Ladino: "destreza",
            Bárbaro: "forca",
            Feitiçeiro: "inteligencia",
        }

        const thisTokenClass = triggerToken.class



        const testParams: Omit<ActionRollParams, "CRI"> =
        {
            tokenId: triggerTokenId,
            usedItemId: undefined,
            // Custo de ação zero não significa uma rolagem sem dado. A rolagem
            // de teste do card continua tendo ao menos 1d20.
            Q: Math.max(1, card.actionsRequired ?? 0),
            P: 1,
            A: await this.battleGetter.getTokenAttributeValue(triggerTokenId, classAtributeConjure[thisTokenClass]),
            PF: (await this.battleGetter.getTokenProficiency(triggerTokenId, searchAtributeConjureProficiency[thisTokenClass]) > 0) ? tokenProficiency : 0,
            O: 0,
            N: (card.manaRequired ?? 0) > 0 ? 1 : 0,
            L: triggerToken.level,
            M: (card.manaRequired ?? 0) * tokenProficiency,
        }

        const testCardRoll = await this.resolveActionRoll(
            battleId,
            testParams,
            "CARD_TEST_ROLL",
            {
                cardId: card.id,
                causalityType: card.causalityType,
                targetTokenIds: affectedTargets.map((token: { id: string }) => token.id),
            },
        );
        const testCardScore = testCardRoll.total;

        const consumeCardCosts = options.consumeCardCosts ?? true;

        if (consumeCardCosts && (card.manaRequired ?? 0) * tokenProficiency > 0) {
            await this.operators.execute(OperatorType.MANA_DECREASE, {
                battleId,
                sourceTokenId: triggerTokenId,
                amount: (card.manaRequired ?? 0) * tokenProficiency,
                cause: "CARD_MANA_COST",
                metadata: { cardId: card.id },
            })
        }

        // Tirando as ações
        const actionCost = Math.max(0, card.actionsRequired ?? 0);
        if (consumeCardCosts && actionCost > 0) {
            await this.battleSetter.tokenDecreaseAction(battleId, triggerTokenId, actionCost)
        }

        const causalitySwitch = card.causalityType === "Defensive" ? card.defenseReplicate : card.causalityType;

        switch (causalitySwitch) {
            case "Cure": {

                for (const token of boardTokens) {

                    const canApply = affectedTargets.some((t: any) => t.id === token.id)

                    if (canApply) {
                        await this.operators.execute(OperatorType.LIFE_INCREMENT, {
                            battleId,
                            sourceTokenId: triggerTokenId,
                            targetTokenId: token.id,
                            amount: rollScore,
                            cause: "CARD_CURE",
                            metadata: { cardId: card.id },
                        })
                    }

                }

                break
            }
            case "Offensive":
                await this.pendingSetter.setPendingOffensiveCard(
                    battleState.pendingQueueId,
                    {
                        resolutionId: crypto.randomUUID(),
                        attackerId: triggerTokenId,
                        cardId: card.id,
                        rawCardResult: rollScore,
                        rawTestResult: testCardScore,
                    },
                );

                runtime.emit(SocketEvent.PENDING_OFFENSIVE_CARD, {
                    card,
                    attackerId: triggerTokenId,
                })

                for (const target of affectedTargets) {
                    await this.battleSetter.setTokenInOffensiveCard(battleId, target.id)
                    runtime.emit(SocketEvent.TOKEN_IN_OFFENSIVE_CARD, target)
                }
                runtime.emit(SocketEvent.FRONTEND_OFFENSIVE_CARD_SCORE, rollScore)
                runtime.emit(SocketEvent.FRONTEND_OFFENSIVE_CARD_TEST_SCORE, testCardScore)
                break
            case "Direct-Damage":

                for (const token of boardTokens) {
                    const canApply = affectedTargets.some((t: any) => t.id === token.id)

                    if (canApply) {
                        const effects = Array.isArray(card.effectToApply) ? card.effectToApply : [];
                        for (const effect of effects) {
                            await MechanicEngine.createMechanic(
                                triggerTokenId,
                                battleId,
                                effect,
                                {
                                    "targetId": token.id
                                }
                            )
                        }
                    }
                }

                for (const token of boardTokens) {

                    const canDamaged = affectedTargets.some((t: any) => t.id === token.id)

                    if (canDamaged) {
                        await this.operators.execute(OperatorType.DAMAGE, {
                            battleId,
                            sourceTokenId: triggerTokenId,
                            targetTokenId: token.id,
                            amount: rollScore,
                            cause: "SPELL_DAMAGE",
                            metadata: {
                                cardId: card.id,
                                attackType: "magico",
                            },
                        })
                    }
                }

                break
            case "Only-Effect-Application": {

                for (const token of boardTokens) {
                    const canApply = affectedTargets.some((t: any) => t.id === token.id)

                    if (canApply) {
                        console.log("[TOKEN ID]: ", token.id)
                        const effects = Array.isArray(card.effectToApply) ? card.effectToApply : [];
                        for (const effect of effects) {
                            await MechanicEngine.createMechanic(
                                triggerTokenId,
                                battleId,
                                effect,
                                {
                                    "targetId": token.id
                                }
                            )
                        }
                    }
                }

                break
            }
            default:
                break
        }

        await syncBattleState(battleId)
        return

    }
}
