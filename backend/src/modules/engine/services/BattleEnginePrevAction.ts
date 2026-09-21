import { BattleEngineNextTurnService } from "./micro-services/BattleEngineNextTurnService";
import { formatPrevisionAttackKey } from "../utils/calculations";
import { runtime } from "@/runtime";
import { SocketEvent } from "@/runtime/Events";
import { syncBattleState } from "../utils/syncBattleState";

import { RollResult } from "../utils/calculations";
import { BattleEngineService } from "./BattleEngineService";

export class BattleEnginePrevAction extends BattleEngineService {
    private readonly battleEngineNextTurnService = new BattleEngineNextTurnService();

    async execute(battleId: string) {

        const battleState = await this.battleStateRepository.findById(battleId)

        if (!battleState) {
            throw new Error("Não foi possível encontrar o combate.")
        }

        const pendingQueue = await this.pendingQueueRepository.findByBattleStateId(battleId)

        if(!pendingQueue) {
            throw new Error("Não existe fila de pendências para realizar a previsão.")
        }

        const pendingAttack = await this.pendingGetter.getPendingAttack(pendingQueue.id)


        const formatedKey = formatPrevisionAttackKey(pendingAttack?.targetId ?? "", pendingAttack?.attackerId ?? "");

        const previsionActions = await this.battleGetter.getPrevisionAttacks(battleId)

        if (previsionActions && previsionActions[formatedKey] > 0) {
            await this.battleSetter.decreasePrevisionAttack(battleId, formatedKey, 1)
            const emptyRoll: RollResult = {
                rawRolls: [],
                total: 0,
                usedMana: 0,
                CRI: 0,
            };

            await this.battleSetter.addActionHistory_2(
                battleId,
                "inteligencia",
                "Ação Prevista",
                emptyRoll,
                pendingAttack?.targetId ?? "",
                pendingAttack?.attackerId ?? "",
                battleState.round
            )

            console.log("[CHEGANDO AQUI??]")
            await this.pendingSetter.cleanPendingAttack(pendingQueue.id)
            runtime.emit(SocketEvent.PENDING_ATTACK, null)

            await this.pendingSetter.cleanPendingEsquivaRoll(pendingQueue.id)
            runtime.emit(SocketEvent.PENDING_ESQUIVA_ROLL,  null)

            runtime.emit(SocketEvent.FRONTEND_IN_DEFENSE_RESOLUTION, false)
            
            const attackerActions = await this.battleGetter.getTokenAction(battleId, pendingAttack?.attackerId ?? "")
            console.log("[TOTAL]: ", attackerActions)
            if(attackerActions <= 0) await this.battleEngineNextTurnService.execute(battleId)
            
            await syncBattleState(battleId)

        }
    }

}
