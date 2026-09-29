import { runtime } from "@/runtime";
import { SocketEvent } from "@/runtime/Events";

import { applyMechanicToToken, getTokensInCardEntityRadius, resolvePivotPosition, resolveTriggerFixPivot } from "../../context/auxiliary/battleFunctions";
import { syncBattleState } from "../../utils/syncBattleState";
import { MechanicEntityInstance } from "../../mechanic/types/mechanicEntity";
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

            runtime.emit(SocketEvent.FRONTEND_SET_PREVIEW_CELLS, { mapId: battleState.mapId, value: [] })
            runtime.emit(SocketEvent.FRONTEND_AMBIENT_PIVOT_PHASE, "confirm")
            runtime.emit(SocketEvent.FRONTEND_SELECTED_PIVOTS, [])
            runtime.emit(SocketEvent.FRONTEND_AMBIENT_PIVOT_SELECTION, false)
            await this.battleSetter.clearTokenInAmbientPivotSelection(battleId)
            runtime.emit(SocketEvent.TOKEN_IN_AMBIENT_PIVOT_SELECTION, "")
            await syncBattleState(battleId)
            return
        }

        const selectedPivots = await this.battleGetter.getSelectedPivots(battleId);

        const instances: MechanicEntityInstance[] = []

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

            const mechanic = await this.battleSetter.addMechanicEntity(
                battleId,
                tokenInAmbientPivotSelection,
                armedCard.effectToApply,
                armedCard.target.pivotSettings.areaImgUrl,
                armedCard.target.pivotSettings.pivotType,
                armedCard.target.pivotSettings.range,
                armedCard.duration,
                resolvedPosition.col,
                resolvedPosition.row,
                armedCard.effectsAffectCaster,
                armedCard.casterEffectsToApply,
                armedCard.triggerEffectsToApply,
            )

            instances.push(mechanic)
        }

        const pendingInstances = instances.filter(
            (instance) => instance.effectsApplied !== true,
        );

        if (pendingInstances.length > 0) {
            const actionCost = Math.max(0, armedCard.actionsRequired ?? 0);
            if (actionCost > 0) {
                const previousActions = await this.battleGetter.getTokenAction(
                    battleId,
                    tokenInAmbientPivotSelection,
                );
                await this.battleSetter.tokenSetAction(
                    battleId,
                    tokenInAmbientPivotSelection,
                    Math.max(0, previousActions - actionCost),
                );
            }
        }

        for (const c of pendingInstances) {
            console.log("[POSITION]: ", c.position)
            console.log("[PIVOT SETTINGS RANGE]: ", c.pivotSettings.range)
            console.log("[TRIGGER ID]: ", c.triggerId)

            const affectedTokens = getTokensInCardEntityRadius(
                boardTokens,
                c.position,
                c.pivotSettings.range,
                c.triggerId,
                c.effectsAffectCaster,
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

        const triggerOnlyEffects = Array.isArray(armedCard.triggerEffectsToApply)
            ? armedCard.triggerEffectsToApply
            : [];

        if (triggerToken && pendingInstances.length > 0 && triggerOnlyEffects.length > 0) {
            await applyMechanicToToken(
                this.battleStateRepository,
                this.tokenInstanceRepository,
                battleId,
                pendingInstances[0],
                triggerToken,
                triggerOnlyEffects,
            );
        }

        for (const instance of pendingInstances) {
            await this.battleSetter.updateMechanicEntity(
                battleId,
                instance.id,
                { effectsApplied: true },
            );
        }

        runtime.emit(SocketEvent.FRONTEND_SET_PREVIEW_CELLS, { mapId: battleState.mapId, value: [] })
        runtime.emit(SocketEvent.FRONTEND_AMBIENT_PIVOT_PHASE, "confirm")
        runtime.emit(SocketEvent.FRONTEND_SELECTED_PIVOTS, [])
        runtime.emit(SocketEvent.FRONTEND_AMBIENT_PIVOT_SELECTION, false)

        await this.battleSetter.clearTokenInAmbientPivotSelection(battleId)
        runtime.emit(SocketEvent.TOKEN_IN_AMBIENT_PIVOT_SELECTION, "")
        
        await syncBattleState(battleId)
    }
}
