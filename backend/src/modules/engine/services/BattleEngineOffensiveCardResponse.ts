import { runtime } from "@/runtime";
import { SocketEvent } from "@/runtime/Events";
import { MechanicEngine } from "../mechanic/MechanicEngine";
import { OperatorType } from "../operators/OperatorType";
import { calculateCertainyDieRoll, formatPrevisionAttackKey } from "../utils/calculations";
import { syncBattleState } from "../utils/syncBattleState";
import { OffensiveCardResponseValidator } from "../validators/OffensiveCardResponseValidator";
import { BattleEngineService } from "./BattleEngineService";
import { BattleEngineNextTurnService } from "./micro-services/BattleEngineNextTurnService";
import {
    AttributeTestResolvedEvent,
    type AttributeTestResolution,
} from "../mechanic/events/AttributeTestResolvedEvent";

export class BattleEngineOffensiveCardResponse extends BattleEngineService {
    private readonly battleEngineNextTurnService = new BattleEngineNextTurnService();

    async execute(userId: string, battleId: string, data: unknown) {
        if (!battleId) {
            throw new Error("ID da batalha não foi fornecido.");
        }

        const choice = OffensiveCardResponseValidator.parse(data);
        const battleState = await this.battleStateRepository.findById(battleId);
        if (!battleState || battleState.status !== "In Battle") {
            throw new Error("A batalha ofensiva não está disponível.");
        }

        const pendingQueue = await this.pendingQueueRepository.findByBattleStateId(battleId);
        if (!pendingQueue) {
            throw new Error("A fila de pendências da batalha não foi encontrada.");
        }

        const pending = await this.pendingGetter.getPendingOffensiveCard(pendingQueue.id);
        if (!pending) {
            throw new Error("Não existe card ofensivo aguardando defesa.");
        }

        const queuedDefenders = Array.isArray(battleState.tokensInOffensiveCard)
            ? battleState.tokensInOffensiveCard as Array<{ id?: unknown }>
            : [];
        const currentDefenderId = queuedDefenders[0]?.id;

        if (typeof currentDefenderId !== "string" || currentDefenderId !== choice.defenderId) {
            throw new Error("Este token não é o defensor atual do card ofensivo.");
        }

        const [attacker, defender, card, map] = await Promise.all([
            this.tokenInstanceRepository.findTokenTemplateById(pending.attackerId),
            this.tokenInstanceRepository.findTokenTemplateById(choice.defenderId),
            this.cardRepository.findCardById(pending.cardId),
            this.mapRepository.findMapById(battleState.mapId),
        ]);

        if (!attacker || !defender || !card || !map) {
            throw new Error("Atacante, defensor, card ou mapa não foram encontrados.");
        }

        if (attacker.mapId !== battleState.mapId || defender.mapId !== battleState.mapId) {
            throw new Error("Os tokens do card ofensivo não pertencem ao mapa da batalha.");
        }

        const campaign = await this.campaignRepository.findCampaignById(map.campaignId);
        const canResolve = battleState.currentActorUserId === userId || campaign?.ownerId === userId;
        if (!canResolve) {
            throw new Error("O usuário atual não pode responder por este defensor.");
        }

        const availableActions = Math.max(
            1,
            (battleState.accumulatedActions as Record<string, number>)[defender.id] ?? 1,
        );
        const usedActions = Math.max(1, Math.min(choice.usedActions, availableActions));
        const usedMana = Math.max(0, Math.min(choice.usedMana, defender.currentMana));
        const proficiency = Math.ceil((defender.level - 10) / 4 + 4);
        const attackerProficiency = Math.ceil((attacker.level - 10) / 4 + 4);
        const previsionKey = formatPrevisionAttackKey(defender.id, attacker.id);

        if (choice.usedCertaintyDie && (defender.certaintyDiceRemaining ?? 0) < 1) {
            throw new Error("O defensor não possui Dado Certo disponível.");
        }

        if (choice.previewAction) {
            const previsions = await this.battleGetter.getPrevisionAttacks(battleId);
            if ((previsions[previsionKey] ?? 0) < 1) {
                throw new Error("O defensor não possui previsão disponível para este card.");
            }
        }

        const baseRoll = await this.resolveActionRoll(
            battleId,
            {
                tokenId: defender.id,
                usedItemId: undefined,
                Q: usedActions,
                P: await this.battleGetter.searchTokenPosition(battleId, defender.id, choice.attribute),
                A: await this.battleGetter.getTokenAttributeValue(defender.id, choice.attribute),
                PF: proficiency,
                O: 0,
                N: usedMana > 0 ? 1 : 0,
                L: defender.level,
                M: usedMana,
            },
            "OFFENSIVE_CARD_DEFENSE_ROLL",
            {
                cardId: card.id,
                attackerTokenId: attacker.id,
                targetTokenId: defender.id,
                attribute: choice.attribute,
            },
        );

        const certaintyRoll = choice.usedCertaintyDie
            ? calculateCertainyDieRoll(baseRoll, usedActions)
            : null;
        const displayRoll = certaintyRoll?.displayRoll ?? baseRoll;
        const defenseTotal = displayRoll.total;
        const testSucceeded = choice.usedCertaintyDie || defenseTotal >= pending.rawTestResult;

        await this.battleSetter.addActionHistory({
            battleStateId: battleId,
            tokenId: defender.id,
            choice: {
                attribute: choice.attribute,
                type: "offensive-card-defense",
                targetId: attacker.id,
            },
            wasCertainty: choice.usedCertaintyDie,
            displayRoll,
        });

        if (choice.usedCertaintyDie) {
            await this.battleSetter.tokenDecreaseCertainyDie(defender.id);
        } else {
            if (usedMana > 0) {
                await this.operators.execute(OperatorType.MANA_DECREASE, {
                    battleId,
                    sourceTokenId: defender.id,
                    amount: usedMana,
                    cause: "OFFENSIVE_CARD_DEFENSE_MANA_COST",
                    metadata: { cardId: card.id, attackerTokenId: attacker.id },
                });
            }

            const remainingActions = Math.max(0, (availableActions + 1) - usedActions);
            await this.battleSetter.tokenSetAction(battleId, defender.id, remainingActions);

            if (choice.previewAction) {
                await this.battleSetter.decreasePrevisionAttack(battleId, previsionKey, 1);
            } else {
                await this.resolveCardConsequences(
                    battleId,
                    attacker.id,
                    defender.id,
                    card,
                    pending.rawCardResult,
                    attackerProficiency,
                    testSucceeded,
                    choice.attribute,
                    pending.resolutionId,
                );
            }
        }

        if (!choice.previewAction) {
            const testResolution: AttributeTestResolution = {
                resolutionId: pending.resolutionId,
                cardId: card.id,
                sourceTokenId: attacker.id,
                targetTokenId: defender.id,
                attribute: choice.attribute,
                succeeded: testSucceeded,
                total: defenseTotal,
                difficulty: pending.rawTestResult,
            };
            await MechanicEngine.process(
                battleId,
                new AttributeTestResolvedEvent(testResolution),
                { test: testResolution },
            );
        }

        await this.battleSetter.removeTokenInOffensiveCard(battleId, defender.id);

        const updatedBattle = await this.battleStateRepository.findById(battleId);
        const remainingDefenders = Array.isArray(updatedBattle?.tokensInOffensiveCard)
            ? updatedBattle.tokensInOffensiveCard
            : [];

        if (remainingDefenders.length === 0) {
            await this.pendingSetter.cleanPendingOffensiveCard(pendingQueue.id);
            runtime.emit(SocketEvent.PENDING_OFFENSIVE_CARD, null);
            runtime.emit(SocketEvent.FRONTEND_OFFENSIVE_CARD_SCORE, null);
            runtime.emit(SocketEvent.FRONTEND_OFFENSIVE_CARD_TEST_SCORE, null);

            const attackerActions = await this.battleGetter.getTokenAction(battleId, attacker.id);
            if (attackerActions <= 0) {
                await this.battleEngineNextTurnService.execute(battleId);
                return;
            }
        }

        await syncBattleState(battleId);
    }

    private async resolveCardConsequences(
        battleId: string,
        attackerId: string,
        defenderId: string,
        card: {
            id: string;
            duration: number | null;
            partialOffensive: boolean | null;
            effectToApply: unknown;
        },
        rawCardResult: number,
        intensity: number,
        testSucceeded: boolean,
        testAttribute: string,
        resolutionId: string,
    ): Promise<void> {
        if (card.partialOffensive === true && testSucceeded) {
            return;
        }

        const effects = Array.isArray(card.effectToApply)
            ? card.effectToApply.filter((effect): effect is string => typeof effect === "string")
            : [];

        for (const effect of effects) {
            await MechanicEngine.createMechanic(attackerId, battleId, effect, {
                targetId: defenderId,
                duration: card.duration ?? 1,
                intensity,
                cardId: card.id,
                resolutionId,
                testAttribute,
                testSucceeded,
            });
        }

        const damage = testSucceeded
            ? Math.floor(rawCardResult / 2)
            : rawCardResult;

        if (damage > 0) {
            await this.operators.execute(OperatorType.DAMAGE, {
                battleId,
                sourceTokenId: attackerId,
                targetTokenId: defenderId,
                amount: damage,
                cause: "OFFENSIVE_CARD",
                metadata: {
                    cardId: card.id,
                    attackType: "magico",
                    testAttribute,
                    testSucceeded,
                    resolutionId,
                },
            });
        }
    }
}
