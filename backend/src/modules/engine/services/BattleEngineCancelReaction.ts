import { BattleEngineNextTurnService } from "./micro-services/BattleEngineNextTurnService";
import { BattleEngineTreatTargetService } from "./micro-services/BattleEngineTreatTargetService";

import { runtime } from "@/runtime";
import { SocketEvent } from "@/runtime/Events";

import { syncBattleState } from "../utils/syncBattleState";
import { grantFreeActionNoReaction } from "../context/auxiliary/battleFunctions";
import { nextParalysisAfterHit } from "../context/auxiliary/battleFunctions";
import { defineRemainingPrevisionAttacks } from "../context/auxiliary/battleFunctions";
import { BattleStateValidator } from "@/modules/battles/validators/BattleStateCreateValidator";
import { MechanicEngine } from "../mechanic/MechanicEngine";
import { OperatorType } from "../operators/OperatorType";
import { BattleEngineService } from "./BattleEngineService";
import { attackTypeFromAttribute } from "../utils/attackType";

export class BattleEngineCancelReaction extends BattleEngineService {
    private readonly battleEngineNextTurnService = new BattleEngineNextTurnService();
    private readonly battleEngineTreatTargetService = new BattleEngineTreatTargetService();

    async execute(battleId: string) {
        if (!battleId) {
            throw new Error("Não foi passada uma string válida para Cancel Reaction.")
        }

        const battleState = await this.battleStateRepository.findById(battleId)

        if (!battleState)
            throw new Error("battleState não existe ou não foi encontrado")

        const battle = BattleStateValidator.parse(battleState)

        const pending = await this.pendingQueueRepository.findByBattleStateId(battleId)

        if (!pending) {
            throw new Error("Não foi encontrado pendingQueue.")
        }

        const pendingAttack = await this.pendingGetter.getPendingAttack(pending.id)

        if (!pendingAttack) {
            throw new Error("Não foi possível cancelar, pois não tem Pending Attack para isso.")
        }

        const boardTokens = await this.tokenInstanceRepository.listByMapId(battleState.mapId)

        if (!boardTokens) {
            throw new Error("Não foram encontrados os boardTokens.")
        }

        const defenderToken = boardTokens.find(t => t.id === pendingAttack.targetId);

        const remainingExtraActions = await this.battleGetter.getRemainingExtraActions(battleId)


        if (pendingAttack.attackAttribute === "forca") {

            if (defenderToken) 
                await MechanicEngine.createMechanic(
                    pendingAttack.attackerId,
                    battleId,
                    pendingAttack.atackElement,
                    {
                        "targetId": pendingAttack.targetId
                    }
                );
            //spawnItemVFX(pendingAttack.attackerId, defenderToken!.id, (pendingAttack.usedItem === null ? undefined : pendingAttack.usedItem), boardTokens, setBoardVfxElements, playSomeSFX)
            //playSomeSFX("public/sfx/impact.mp3");
            await this.operators.execute(OperatorType.DAMAGE, {
                battleId,
                sourceTokenId: pendingAttack.attackerId,
                targetTokenId: pendingAttack.targetId,
                amount: pendingAttack.rawDamage,
                element: pendingAttack.atackElement,
                metadata: {
                    attackType: attackTypeFromAttribute(pendingAttack.attackAttribute),
                    attackAttribute: pendingAttack.attackAttribute,
                },
            })

        }

        if (pendingAttack.attackAttribute === "inteligencia") {
            defineRemainingPrevisionAttacks(this.battleSetter, battleId, pendingAttack.attackerId, pendingAttack.targetId, 1)
        }

        const current = await this.battleGetter.getParalysis(battleId, pendingAttack.targetId);

        const nextState = nextParalysisAfterHit(current, pendingAttack.usedMana, (remainingExtraActions.extraActions ?? 0));
        if (nextState !== current) await this.battleSetter.setParalysis(battleId, pendingAttack.targetId, nextState)

        if (pendingAttack.attackAttribute === "sabedoria") {
            await this.battleSetter.tokenSetAction(
                battleId,
                pendingAttack.attackerId,
                Math.min(5, battle.accumulatedActions[pendingAttack.targetId] +
                            battle.accumulatedActions[pendingAttack.attackerId]
                ))
            await this.battleSetter.tokenSetAction(battleId, pendingAttack.targetId, 1)

            await grantFreeActionNoReaction(
                this.battleSetter,
                this.pendingSetter,
                battleId,
                pending.id,
                pendingAttack.attackerId,
                pendingAttack.targetId,
                "paralisia",
                1
            )
        }

        if (pendingAttack.attackAttribute === "destreza") {

            await grantFreeActionNoReaction(
                this.battleSetter,
                this.pendingSetter,
                battleId,
                pending.id,
                pendingAttack.attackerId,
                pendingAttack.targetId,
                "paralisia",
                3
            )

        }

        const finalActions = await this.battleGetter.getTokenAction(battleId, pendingAttack.attackerId)
        const finalActionClone: number = structuredClone(finalActions)

        await this.pendingSetter.cleanPendingAttack(pending.id)
        runtime.emit(SocketEvent.PENDING_ATTACK, null)

        await this.pendingSetter.cleanPendingEsquivaRoll(pending.id)
        runtime.emit(SocketEvent.PENDING_ESQUIVA_ROLL, null)

        runtime.emit(SocketEvent.FRONTEND_IN_DEFENSE_RESOLUTION, false)
        
        //Avançar turno de forma inteligente
        if(finalActionClone <= 0) {
            await this.battleEngineNextTurnService.execute(battleId)
        } else {
            await syncBattleState(battleId)
        }
        
    }
}
