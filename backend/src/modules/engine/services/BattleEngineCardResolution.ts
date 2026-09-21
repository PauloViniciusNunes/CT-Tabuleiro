import { BattleEngineNextTurnService } from "./micro-services/BattleEngineNextTurnService";
import { BattleEngineTreatTargetService } from "./micro-services/BattleEngineTreatTargetService";

import { runtime } from "@/runtime";
import { SocketEvent } from "@/runtime/Events";

import { syncBattleState } from "../utils/syncBattleState";
import { CardChoiceValidator } from "../validators/CardChoiceValidator";
import { EngineCardValidator } from "../validators/EngineCardValidator";
import { BattleEngineService } from "./BattleEngineService";
import { OperatorType } from "../operators/OperatorType";

export class BattleEngineCardResolution extends BattleEngineService {
    private readonly battleEngineNextTurnService = new BattleEngineNextTurnService();
    private readonly battleEngineTreatTargetService = new BattleEngineTreatTargetService();

    async execute(
        battleId: string,
        choice: any,
        options: { trustedArtifice?: boolean } = {},
    ) {

        /*
        
        {
            battleId: string,
            currentId: string,
            card: any,
            target: any,
            isArtifice: boolean,
        }
        
        */

        /* ======= VALIDAÇÕES INICIAIS ======= */
        if (!battleId) {
            throw new Error("ID da batalha não foi fornecido.")
        }

        const battleState = await this.battleStateRepository.findById(battleId)

        if (!battleState) {
            throw new Error("Nenhuma batalha foi encontrada.")
        }

        const boardTokens = await this.tokenInstanceRepository.listByMapId(battleState.mapId)

        if (!boardTokens) {
            throw new Error("Não foram econtrados tokens no mapa especificado.")
        }


        if (battleState.status !== "In Battle") {
            throw new Error("Não foi possível realizar a ação. Não está em batalha.")
        }

        const pendingQueue = await this.pendingQueueRepository.findByBattleStateId(battleId)

        if(!pendingQueue) {
            throw new Error("Não foi possível encontrar pendingQueue para BattleEngineCardResolution.")
        }

        if (await this.pendingGetter.getPendingOffensiveCard(pendingQueue.id)) {
            throw new Error("Ainda existe um card ofensivo aguardando resolução.")
        }
        /* ======= VALIDAÇÕES INICIAIS ======= */

        const newChoice = CardChoiceValidator.parse(choice)

        const persistedCard = await this.cardRepository.findCardById(newChoice.card.id)
        if (!persistedCard) {
            throw new Error("O card selecionado não foi encontrado.")
        }
        const card = EngineCardValidator.parse(persistedCard)
        if (newChoice.isArtifice && !options.trustedArtifice) {
            throw new Error("Artifícios devem ser usados pela rota de inventário.");
        }
        const isArtifice = options.trustedArtifice === true
        const target = newChoice.target
        const currentId = newChoice.currentId
        const targetType = card.target.type
        const actionCost = card.actionsRequired
        const selectedPivots = await this.battleGetter.getSelectedPivots(battleId)

        const token = await this.tokenInstanceRepository.findTokenTemplateById(currentId)

        if (!token) 
            throw new Error("Não foi possível encontrar o token.");

        if (battleState.currentActorId !== currentId) {
            throw new Error("Apenas o token do turno atual pode usar um card.");
        }

        const currentActions = await this.battleGetter.getTokenAction(battleId, currentId)

        if(!isArtifice && currentActions < actionCost)
            throw new Error("Token não possui ações suficientes para usar esse card.")

        const tokenProficiency = Math.ceil(((token.level ?? 1) - 10) / 4 + 4);

        const currentNotRechargeds = await this.battleGetter.getCardsNotRechargeds(battleId)
        const cardsNotRechargeds: Record<string, string[]> = structuredClone(currentNotRechargeds)

        if(!isArtifice && cardsNotRechargeds[currentId] && cardsNotRechargeds[currentId].includes(card.id)) {
            throw new Error("Aviso de violação! Não pode usar um card que não foi recarregado.")
        }

        /* Usar card selecionado e aplicar sua recarga. Não inclui gasto de ação nem de mana */
        console.log("[RECHARGE]: ", cardsNotRechargeds[currentId])
        if (!isArtifice && (card.recharge as number) > 0) {
            if (cardsNotRechargeds[currentId] === undefined) {
                await this.battleSetter.addCardNotRecharged(battleId, currentId, card.id)
                await this.battleSetter.addTimeToRechargedCard(battleId, currentId, card.id, card.recharge as number)
            }
            else if (!(cardsNotRechargeds[currentId].includes(card.id))) {
                await this.battleSetter.addCardNotRecharged(battleId, currentId, card.id)
                await this.battleSetter.addTimeToRechargedCard(battleId, currentId, card.id, card.recharge as number)
            }
        }
        /* * */

        const pendingCardResolution = await this.pendingGetter.getPendingCardResolution(battleState.pendingQueueId)

        if (isArtifice && pendingCardResolution) {
            throw new Error("Resolva o card pendente antes de usar um artifício.");
        }


        if (pendingCardResolution || isArtifice) {
            const currentTokenR = boardTokens.find((t) => t.id === currentId)
            
            
            if (targetType !== "Ambient") {

                if (currentTokenR) {
                    // Quem realmente são o tokenTriggerId e o tokenTrigger?
                    await this.battleEngineTreatTargetService.execute(
                        battleId,
                        currentId,
                        target,
                        card,
                        { consumeCardCosts: !isArtifice },
                    )
                };

                await this.battleSetter.setCardAreUsed(battleId, true)
            }
            else if (targetType === "Ambient") {
                const manaCost = (card.manaRequired ?? 0) * tokenProficiency;
                const environment = await this.operators.execute(
                    OperatorType.ENVIRONMENT,
                    {
                        battleId,
                        mapId: battleState.mapId,
                        sourceTokenId: currentId,
                        cause: "SPELL",
                        metadata: { cardId: card.id },
                        change: {
                            kind: `spell:${card.id}`,
                            scope: card.target.pivotSettings?.pivotType === "Trigger-Fix"
                                ? "area"
                                : "cell",
                            payload: {
                                cardId: card.id,
                                effects: card.effectToApply,
                            },
                        },
                        apply: async () => {
                            if (!isArtifice && manaCost > 0) {
                                await this.operators.execute(OperatorType.MANA_DECREASE, {
                                    battleId,
                                    sourceTokenId: currentId,
                                    amount: manaCost,
                                    cause: "AMBIENT_CARD_MANA_COST",
                                    metadata: { cardId: card.id },
                                });
                            }
                            await this.battleSetter.setArmedCard(battleId, card);
                            runtime.emit(SocketEvent.FRONTEND_ARMED_CARD, card);

                            await this.battleSetter.setTokenInAmbientPivotSelection(battleId, currentId);
                            runtime.emit(SocketEvent.TOKEN_IN_AMBIENT_PIVOT_SELECTION, currentId);

                            if (card.target.pivotSettings?.pivotType === "Trigger-Fix" && currentTokenR) {
                                await this.battleSetter.addMechanicEntity(
                                    battleId,
                                    currentId,
                                    card.effectToApply,
                                    card.target.pivotSettings.areaImgUrl,
                                    card.target.pivotSettings?.pivotType,
                                    card.target.pivotSettings.range,
                                    card.duration,
                                    currentTokenR.col,
                                    currentTokenR.row,
                                );
                                if (!isArtifice && actionCost > 0) {
                                    await this.battleSetter.tokenDecreaseAction(
                                        battleId,
                                        currentId,
                                        actionCost,
                                    );
                                }
                                runtime.emit(SocketEvent.FRONTEND_AMBIENT_PIVOT_SELECTION, false);
                            } else {
                                await this.battleSetter.setMaxSelectablePivots(
                                    battleId,
                                    card.entityQuantity,
                                );
                                const maxSelectablePivots = await this.battleGetter.getMaxSelectablePivots(battleId);
                                await this.battleSetter.setRemainingPivots(
                                    battleId,
                                    maxSelectablePivots - selectedPivots.length,
                                );
                                runtime.emit(SocketEvent.FRONTEND_AMBIENT_PIVOT_SELECTION, true);
                            }
                        },
                    },
                );

                if (environment.status === "DENIED") {
                    // The recharge was persisted before interception. A denied
                    // spell was still cast, so its regular costs are consumed.
                    if (!isArtifice) {
                        if (manaCost > 0) {
                            await this.operators.execute(OperatorType.MANA_DECREASE, {
                                battleId,
                                sourceTokenId: currentId,
                                amount: manaCost,
                                cause: "DENIED_AMBIENT_CARD_MANA_COST",
                                metadata: { cardId: card.id },
                            });
                        }
                        if (actionCost > 0) {
                            await this.battleSetter.tokenDecreaseAction(
                                battleId,
                                currentId,
                                actionCost,
                            );
                        }
                    }
                    await this.battleSetter.setCardAreUsed(battleId, true);
                }

            }

            // Marca que o token AGIU voluntariamente neste turno
            await this.battleSetter.addDidActThisTurn(battleId, currentId, true)
            
            if (!isArtifice) {
                await this.pendingSetter.cleanPendingCardResolution(pendingQueue.id)
                runtime.emit(SocketEvent.PENDING_CARD_RESOLUTION, null)
                runtime.emit(SocketEvent.FRONTEND_CARD_SELECTION, false)
            }

            const finalActions = 
                await this.battleGetter.getTokenAction(battleId, currentId);
            
            if(!isArtifice && finalActions <= 0) {
                await this.battleEngineNextTurnService.execute(battleId)
            }

            await syncBattleState(battleId)
        }
    }
}
