import { runtime } from "@/runtime";
import { SocketEvent } from "@/runtime/Events";

import { getCellsInRadius } from "../../context/auxiliary/battleFunctions";
import { syncBattleState } from "../../utils/syncBattleState";
import { BattleEngineService } from "../BattleEngineService";

export class BattleEnginePivotSelection extends BattleEngineService {

    async execute(battleId: string, data: any) {
        const battleState = await this.battleStateRepository.findById(battleId);

        if (!battleState) {
            throw new Error("Não foi possível encontrar battleState para BattleEnginePivotSelection.");
        }

        const armedCard = await this.battleGetter.getArmedCard(battleId);
        const pivotType = armedCard.target.pivotSettings.pivotType;

        // 🔢 Controle de pivots
        const remainingPivots = await this.battleGetter.getRemainingPivots(battleId);
        const selectedPivots = await this.battleGetter.getSelectedPivots(battleId);

        const rPivots = Math.max(remainingPivots - 1, 0);
        console.log("[R PIVOTS]: ", rPivots);
        await this.battleSetter.setRemainingPivots(battleId, rPivots);

        runtime.emit(SocketEvent.FRONTEND_AMBIENT_PIVOT_PHASE, "preview");

        const payload = data.payload;
        const letter = data.letter;
        const number = data.number;
        const letters = data.letters;
        const gridCells = data.gridCells;

        if (rPivots >= 0 && (selectedPivots.length ?? 0) < battleState.maxSelectablePivots) {
            if (pivotType === "Cell-Fix") {
                if (payload.type === "cell") {
                    const pivot = {
                        col: letters.indexOf(letter) + 1,
                        row: number,
                    };

                    const range = armedCard!.target.pivotSettings!.range;
                    const cells = getCellsInRadius(pivot, range, gridCells);

                    runtime.emit(SocketEvent.FRONTEND_ADD_PREVIEW_CELLS, cells);
                    await this.battleSetter.addSelectedPivot(battleId, { type: "cell", position: pivot });
                }
            } else if (pivotType === "Token-Fix") {
                if (payload.type === "token") {
                    const token = payload.token;

                    const range = armedCard!.target.pivotSettings!.range;
                    const cells = getCellsInRadius(token.position, range, gridCells);

                    runtime.emit(SocketEvent.FRONTEND_ADD_PREVIEW_CELLS, cells);
                    runtime.emit(SocketEvent.FRONTEND_SELECTED_CELL, null);

                    await this.battleSetter.addSelectedPivot(battleId, { type: "token", tokenId: token.id });
                }
            } else if (pivotType === "Trigger-Fix") {
                await this.battleSetter.addSelectedPivot(battleId, { type: "trigger" });
            }
        }

        // 🟢 Sincronização garantida: executa SEMPRE ao final do processo
        await syncBattleState(battleId);
    }
}
