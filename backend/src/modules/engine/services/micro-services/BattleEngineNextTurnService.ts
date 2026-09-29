import { BattleStateValidator } from "@/modules/battles/validators/BattleStateCreateValidator";
import { syncBattleState } from "../../utils/syncBattleState";

import { MechanicEngine } from "../../mechanic/MechanicEngine";
import { TurnInitEvent } from "../../mechanic/events/TurnInitEvent";
import { reduceTimeToRecharge } from "../../utils/reduceTimeToRecharge";
import { BattleEngineService } from "../BattleEngineService";
import { BattleEngineTransformService } from "../BattleEngineTransformService";
import { OperatorType } from "../../operators/OperatorType";
import type { MechanicInstance } from "../../mechanic/mechanics/MechanicInstance";

function mechanicTargetId(mechanic: Readonly<MechanicInstance>): string {
    const targetId = mechanic.metadata.targetId;
    return typeof targetId === "string" && targetId
        ? targetId
        : mechanic.sourceTokenId;
}

function cancelsNextTurn(
    mechanic: Readonly<MechanicInstance>,
    tokenId: string,
): boolean {
    return mechanic.metadata.cancelNextTurn === true &&
        mechanic.metadata.passive !== true &&
        mechanicTargetId(mechanic) === tokenId;
}

export class BattleEngineNextTurnService extends BattleEngineService {
    private readonly transformService = new BattleEngineTransformService();

    private findNextPlayableTurn(
        turnOrder: readonly { tokenId: string }[],
        currentIndex: number,
        activeMechanics: readonly MechanicInstance[],
    ): {
        nextIndex: number;
        nextTokenId: string;
        skipped: Array<{ tokenId: string; mechanicIds: string[] }>;
        incrementRound: boolean;
    } {
        if (turnOrder.length === 0) {
            throw new Error("Turn order has no tokens.");
        }

        const skipped: Array<{ tokenId: string; mechanicIds: string[] }> = [];
        let crossedRound = false;

        for (let offset = 1; offset <= turnOrder.length; offset += 1) {
            const rawIndex = currentIndex + offset;
            const nextIndex = rawIndex % turnOrder.length;
            crossedRound ||= rawIndex >= turnOrder.length;

            const nextTokenId = turnOrder[nextIndex]?.tokenId;
            if (!nextTokenId) continue;

            const cancellationMechanics = activeMechanics.filter((mechanic) =>
                cancelsNextTurn(mechanic, nextTokenId),
            );
            if (cancellationMechanics.length > 0) {
                skipped.push({
                    tokenId: nextTokenId,
                    mechanicIds: cancellationMechanics.map((mechanic) => mechanic.id),
                });
                continue;
            }

            return {
                nextIndex,
                nextTokenId,
                skipped,
                incrementRound: crossedRound,
            };
        }

        // Consume all cancellations and resume the immediate next slot.
        const nextIndex = (currentIndex + 1) % turnOrder.length;
        const nextTokenId = turnOrder[nextIndex]?.tokenId;
        if (!nextTokenId) {
            throw new Error("Could not find next turn token.");
        }

        return {
            nextIndex,
            nextTokenId,
            skipped,
            incrementRound: currentIndex + 1 >= turnOrder.length,
        };
    }

    private async consumeCancelledTurns(
        battleId: string,
        skipped: readonly { tokenId: string; mechanicIds: readonly string[] }[],
    ): Promise<void> {
        for (const { tokenId, mechanicIds } of skipped) {
            // Forced inactivity must never grant an extra action next turn.
            await this.battleSetter.addLastTurnActed(battleId, tokenId, true);
            await this.battleSetter.addLastTurnMoved(battleId, tokenId, true);
            await this.battleSetter.addDidActThisTurn(battleId, tokenId, true);
            await this.battleSetter.addMovedThisTurn(battleId, tokenId, true);

            for (const mechanicId of mechanicIds) {
                await MechanicEngine.removeMechanicInstance(
                    battleId,
                    mechanicId,
                    "turn-cancelled",
                );
            }
        }
    }

    async execute(battleId: string, specialResponseContinuationId?: string) {
        
        // Verificar se battleId é mesmo uma string
        if(!battleId) {
            throw new Error("Battle ID não foi enviado como uma string")
        }

        const battleState = await this.battleStateRepository.findById(battleId)

        if(!battleState) {
            throw new Error("Não foi possível encontrar uma batalha.")
        }

        const battle = BattleStateValidator.parse(battleState)

        if(!battle.id) {
            throw new Error("Não foi possível obter battle id por 'parse'.")
        }

        const pendingQueue = await this.pendingQueueRepository.findByBattleStateId(battle.id)

        if(!pendingQueue) {
            throw new Error("Nenhuma fila de pêndencias foi encontrada.")
        }

        const pendingAttack = await this.pendingGetter.getPendingAttack(pendingQueue.id)
        const pendingEsquivaRoll = await this.pendingGetter.getPendingEsquivaRoll(pendingQueue.id)
        const pendingOffensiveCard = await this.pendingGetter.getPendingOffensiveCard(pendingQueue.id)
        const pendingSpecialResponse = await this.pendingGetter.getPendingSpecialResponse(pendingQueue.id)
        const pendingTransformation = await this.pendingGetter.getPendingTransformationResolution(pendingQueue.id)


        const liveBattleState = battle;

        // Só funciona em batalha
        if (liveBattleState.status !== "In Battle") {
            console.log("[HANDLE] NOT IN BATTLE, ABORDANDO");
            return;
        }

        // Não pode avançar com resolução pendente
        if (
            pendingAttack ||
            pendingEsquivaRoll != null ||
            pendingOffensiveCard ||
            pendingTransformation ||
            (pendingSpecialResponse &&
                pendingSpecialResponse.requestId !== specialResponseContinuationId) ||
            (Array.isArray(battleState.tokensInOffensiveCard) && battleState.tokensInOffensiveCard.length > 0)
        ) {
            console.warn("[HANDLE] Há resolução de ataque/defesa pendente, abortando");
            return;
        }

        const currentIdx = liveBattleState.currentTurnIndex;
        const currentTokenId = liveBattleState.turnOrder[currentIdx]?.tokenId;

        if (!currentTokenId) {
            console.log("[HANDLE] Sem tokenId atual, abortando");
            return;
        }

        await reduceTimeToRecharge(battleId, currentTokenId)
        await this.transformService.advanceForToken(battleId, currentTokenId)

        try {

            const actedNow = (await this.battleGetter.getDidActThisTurn(battleId))[currentTokenId]
            const movedNow = (await this.battleGetter.getMovedThisTurn(battleId))[currentTokenId]

            // Snapshot do turno que está encerrando
            await this.battleSetter.addLastTurnActed(battleId, currentTokenId, actedNow)
            await this.battleSetter.addLastTurnMoved(battleId, currentTokenId, movedNow)

            const activeMechanics = Array.isArray(battleState.activeMechanics)
                ? battleState.activeMechanics as unknown as MechanicInstance[]
                : [];
            const nextTurn = this.findNextPlayableTurn(
                liveBattleState.turnOrder,
                currentIdx,
                activeMechanics,
            );
            await this.consumeCancelledTurns(battleId, nextTurn.skipped);

            await this.battleSetter.battleNewTurn(
                battleId,
                currentIdx,
                nextTurn.nextIndex,
                nextTurn.nextTokenId,
                { incrementRound: nextTurn.incrementRound },
            )

            // Marca a posição inicial do próximo token para rastrear movimento.
            if (nextTurn.nextTokenId) {

                const nextActed = (await this.battleGetter.getDidActThisTurn(battleId))[nextTurn.nextTokenId]
                const nextMoved = (await this.battleGetter.getMovedThisTurn(battleId))[nextTurn.nextTokenId]

                if(!(nextActed || nextMoved) && battleState.round !== 1) {
                    await this.operators.execute(OperatorType.ACTION_INCREMENT, {
                        battleId,
                        sourceTokenId: nextTurn.nextTokenId,
                        targetTokenId: nextTurn.nextTokenId,
                        amount: 1,
                        cause: "TURN_ACTION_GRANT",
                    })
                }

                const nextTokenActions = await this.battleGetter.getTokenAction(battleId, nextTurn.nextTokenId)

                // Concede 1 ação ao próximo token, ele não pode ficar sem.
                if(nextTokenActions < 1) {
                    await this.battleSetter.tokenSetAction(battleId, nextTurn.nextTokenId, 1)
                }

                await this.battleSetter.addDidActThisTurn(battleId, nextTurn.nextTokenId, false)
                await this.battleSetter.addMovedThisTurn(battleId, nextTurn.nextTokenId, false)
                await this.battleSetter.tokenDefineStartPosition(nextTurn.nextTokenId)
            }

        } finally {
            await MechanicEngine.process(battleId, new TurnInitEvent())
            await syncBattleState(battleId)
        }
    }
}
