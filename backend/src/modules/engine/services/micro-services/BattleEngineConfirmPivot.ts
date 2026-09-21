import { runtime } from "@/runtime";
import { SocketEvent } from "@/runtime/Events";

import { applyMechanicToToken, getTokensInCardEntityRadius, resolvePivotPosition, resolveTriggerFixPivot } from "../../context/auxiliary/battleFunctions";
import { syncBattleState } from "../../utils/syncBattleState";
import { MechanicEntityInstance } from "../../mechanic/types/mechanicEntity";
import { mountMechanicEntity } from "../../mechanic/utils/functions";
import { BattleEngineService } from "../BattleEngineService";

export class BattleEngineConfirmPivot extends BattleEngineService {

    async execute(battleId: string, data: any) {

        if (!battleId) throw new Error("Não foi passado um ID válido para confimar.");
        const battleState = await this.battleStateRepository.findById(battleId);
        if (!battleState) throw new Error("Não foi possível encontrar battleState para BattleEnginePivotSelection.");

        const armedCard = await this.battleGetter.getArmedCard(battleId)

        if (!armedCard?.target?.pivotSettings) {
            console.error("Entrou no confirm ambient vazio!")
            return;
        }

        if (!armedCard?.target?.pivotSettings) {
            throw new Error("Ambient card sem pivotSettings");
        }

        const boardTokens = await this.tokenInstanceRepository.listByMapId(battleState.mapId)

        if (!boardTokens)
            throw new Error("Não existe ou não foi encontrados boardTokens para confirmar.");

        const tokenInAmbientPivotSelection = await this.battleGetter.getTokenInAmbientPivotSelection(battleId)

        const prevActions = await this.battleGetter.getTokenAction(battleId, tokenInAmbientPivotSelection)
        const actionCost = Math.max(0, armedCard.actionsRequired ?? 0)

        if (actionCost > 0) {
            await this.battleSetter.tokenSetAction(
                battleId,
                tokenInAmbientPivotSelection,
                Math.max(0, prevActions - actionCost),
            )
        }

        await this.battleSetter.setCardAreUsed(battleId, true)

        const triggerToken = boardTokens.find((t) => t.id === tokenInAmbientPivotSelection);
        const pivotType = armedCard.target.pivotSettings?.pivotType;

        if (pivotType === "Trigger-Fix") {
            await resolveTriggerFixPivot(
                battleId,
                this.battleStateRepository,
                this.tokenInstanceRepository,
                this.battleSetter,
                this.battleGetter,
                triggerToken
            )

            await syncBattleState(battleId)
            return
        }

        const selectedPivots = await this.battleGetter.getSelectedPivots(battleId);

        let instances: MechanicEntityInstance[] = []

        console.log("SELECTED PIVOT LENGHT: ", selectedPivots.length)
        for (const pivot of selectedPivots) {

            const resolvedPosition = await resolvePivotPosition(
                battleId,
                this.battleStateRepository,
                this.tokenInstanceRepository,
                this.pendingQueueRepository,
                this.pendingGetter,
                pivot
            )

            const mechanic = mountMechanicEntity(
                tokenInAmbientPivotSelection,
                armedCard.effectToApply,
                armedCard.target.pivotSettings.areaImgUrl,
                armedCard.target.pivotSettings.pivotType,
                armedCard.target.pivotSettings.range,
                armedCard.duration,
                resolvedPosition.col,
                resolvedPosition.row
            )

            instances.push(mechanic)
        }

        for (const c of instances) {
            console.log("[POSITION]: ", c.position)
            console.log("[PIVOT SETTINGS RANGE]: ", c.pivotSettings.range)
            console.log("[TRIGGER ID]: ", c.triggerId)

            const affectedTokens = getTokensInCardEntityRadius(
                boardTokens,
                c.position,
                c.pivotSettings.range,
                c.triggerId
            );

            for (const t of affectedTokens) {
                console.log("[TOKEN NAME]: ", t?.name)
                await applyMechanicToToken(
                    this.battleStateRepository,
                    this.tokenInstanceRepository,
                    battleId,
                    c,
                    t

                );
            }

        }

        for (const instance of instances) {
            await this.battleSetter.addMechanicEntity(
                battleId,
                instance.triggerId,
                instance.effectToApply,
                instance.pivotSettings.areaImgUrl,
                instance.pivotSettings.pivotType,
                instance.pivotSettings.range,
                instance.duration,
                instance.position.col,
                instance.position.row
            )
        }

        runtime.emit(SocketEvent.FRONTEND_SET_PREVIEW_CELLS, new Set())
        runtime.emit(SocketEvent.FRONTEND_AMBIENT_PIVOT_PHASE, "confirm")
        runtime.emit(SocketEvent.FRONTEND_SELECTED_PIVOTS, [])
        runtime.emit(SocketEvent.FRONTEND_AMBIENT_PIVOT_SELECTION, false)

        await this.battleSetter.clearTokenInAmbientPivotSelection(battleId)
        runtime.emit(SocketEvent.TOKEN_IN_AMBIENT_PIVOT_SELECTION, "")
        
        await syncBattleState(battleId)
    }
}
