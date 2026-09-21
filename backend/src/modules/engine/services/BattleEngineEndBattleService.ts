import { runtime } from "@/runtime";
import { SocketEvent } from "@/runtime/Events";
import { syncBattleState } from "../utils/syncBattleState";
import { BattleEngineService } from "./BattleEngineService";
import { emitPendingSpecialResponse } from "../special-response/emitSpecialResponse";


export class BattleEngineEndBattleService extends BattleEngineService {
    async execute(battleId: string) {

        if (!battleId) {
            throw new Error("Não foi passado uma string válida para o battleId.")
        }

        const battleState = await this.battleStateRepository.findById(battleId)

        if (!battleState) {
            throw new Error("O Estado de batalha não foi encontrado para ser encerrado.")
        }

        const boardTokens = await this.tokenInstanceRepository.listByMapId(battleState.mapId)

        const mapId = battleState.mapId;

        // 1. PRIMEIRO: Reseta estatísticas e posições dos tokens no mapa
        await this.battleSetter.resetTokenRuntimeStats(mapId)
        await this.battleSetter.resetTokenBattlePosition(battleId)

        for(const token of boardTokens) {
            if(!token) continue

            await this.battleSetter.cleanTokenOverlay(token.id)
        }

        await syncBattleState(battleId)
        // 2. SEGUNDO: Deleta o estado da batalha e sua fila na mesma transação.
        await this.battleStateRepository.delete(battleId)

        // 3. TERCEIRO: Limpa todos os estados auxiliares do frontend via socket
        runtime.emit(SocketEvent.PENDING_ATTACK, null)
        runtime.emit(SocketEvent.FRONTEND_CARD_SELECTION, false)
        runtime.emit(SocketEvent.PENDING_CARD_RESOLUTION, null)
        runtime.emit(SocketEvent.FRONTEND_OFFENSIVE_CARD_SCORE, null)
        runtime.emit(SocketEvent.FRONTEND_OFFENSIVE_CARD_TEST_SCORE, null)
        runtime.emit(SocketEvent.PENDING_OFFENSIVE_CARD, undefined)
        runtime.emit(SocketEvent.PENDING_FREE_RESPONSE, null)
        runtime.emit(SocketEvent.FRONTEND_ARMED_CARD, undefined)
        runtime.emit(SocketEvent.FRONTEND_AMBIENT_PIVOT_SELECTION, false)
        runtime.emit(SocketEvent.FRONTEND_SELECTED_PIVOTS, [])
        runtime.emit(SocketEvent.FRONTEND_SET_PREVIEW_CELLS, new Set())
        runtime.emit(SocketEvent.FRONTEND_IN_DEFENSE_RESOLUTION, false)
        runtime.emit(SocketEvent.FRONTEND_IN_TARGET_SELECTION, false)
        runtime.emit(SocketEvent.FRONTEND_SELECTED_TARGET, null)
        runtime.emit(SocketEvent.TOKEN_IN_AMBIENT_PIVOT_SELECTION, "")
        emitPendingSpecialResponse(mapId, null)

        // 4. QUARTO: Emite o encerramento limpo para o frontend (com status adequado ou null)
        const closedBattleState = {
            id: "",
            status: "Not in Battle",
            round: 0,
            turnOrder: [],
            currentTurnIndex: 0,
            currentActorId: null,
            currentActorUserId: "",
            phase: "Initiative",
            locks: {
                reallocating: false,
                resolvingAction: false
            },
            accumulatedActions: {},
            activeEffects: {},
            actionHistory: [],
            isReallocatingTurns: false,
            turnVersion: 0,
            mapId: mapId
        };

        runtime.emit(SocketEvent.BATTLE_UPDATED, closedBattleState);
        
    }
}
