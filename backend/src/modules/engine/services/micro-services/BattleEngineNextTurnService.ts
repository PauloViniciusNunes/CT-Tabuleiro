import { BattleStateValidator } from "@/modules/battles/validators/BattleStateCreateValidator";
import { syncBattleState } from "../../utils/syncBattleState";

import { MechanicEngine } from "../../mechanic/MechanicEngine";
import { TurnInitEvent } from "../../mechanic/events/TurnInitEvent";
import { reduceTimeToRecharge } from "../../utils/reduceTimeToRecharge";
import { BattleEngineService } from "../BattleEngineService";
import { OperatorType } from "../../operators/OperatorType";

export class BattleEngineNextTurnService extends BattleEngineService {

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
            (pendingSpecialResponse &&
                pendingSpecialResponse.requestId !== specialResponseContinuationId) ||
            (Array.isArray(battleState.tokensInOffensiveCard) && battleState.tokensInOffensiveCard.length > 0)
        ) {
            console.warn("[HANDLE] Há resolução de ataque/defesa pendente, abortando");
            return;
        }

        const currentIdx = liveBattleState.currentTurnIndex;
        const currentTokenId = liveBattleState.turnOrder[currentIdx]?.tokenId;

        reduceTimeToRecharge(battleId, currentTokenId)

        if (!currentTokenId) {
            console.log("[HANDLE] Sem tokenId atual, abortando");
            return;
        }

        try {

            const actedNow = (await this.battleGetter.getDidActThisTurn(battleId))[currentTokenId]
            const movedNow = (await this.battleGetter.getMovedThisTurn(battleId))[currentTokenId]

            // Snapshot do turno que está encerrando
            await this.battleSetter.addLastTurnActed(battleId, currentTokenId, actedNow)
            await this.battleSetter.addLastTurnMoved(battleId, currentTokenId, movedNow)

            const nextIdx = (currentIdx + 1) % liveBattleState.turnOrder.length;
            const nextTokenId = liveBattleState.turnOrder[nextIdx]?.tokenId;
            
            await this.battleSetter.battleNewTurn(
                battleId,
                currentIdx,
                nextIdx,
                nextTokenId
            )

            // Marca a posição inicial do PRÓXIMO token para rastrear movimento dentro do turno
            if (nextTokenId) {

                const nextActed = (await this.battleGetter.getDidActThisTurn(battleId))[nextTokenId]
                const nextMoved = (await this.battleGetter.getMovedThisTurn(battleId))[nextTokenId]

                if(!(nextActed || nextMoved) && battleState.round !== 1) {
                    await this.operators.execute(OperatorType.ACTION_INCREMENT, {
                        battleId,
                        sourceTokenId: nextTokenId,
                        targetTokenId: nextTokenId,
                        amount: 1,
                        cause: "TURN_ACTION_GRANT",
                    })
                }

                const nextTokenActions = await this.battleGetter.getTokenAction(battleId, nextTokenId)

                // Concede 1 ação ao próximo token, ele não pode ficar sem.
                if(nextTokenActions < 1) {
                    await this.battleSetter.tokenSetAction(battleId, nextTokenId, 1)
                }

                await this.battleSetter.addDidActThisTurn(battleId, nextTokenId, false)
                await this.battleSetter.addMovedThisTurn(battleId, nextTokenId, false)
                await this.battleSetter.tokenDefineStartPosition(nextTokenId)
            }

        } finally {
            await MechanicEngine.process(battleId, new TurnInitEvent())
            await syncBattleState(battleId)
        }
    }
}
