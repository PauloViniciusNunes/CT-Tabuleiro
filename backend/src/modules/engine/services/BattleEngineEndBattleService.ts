import { runtime } from "@/runtime";
import { SocketEvent } from "@/runtime/Events";
import { syncBattleState } from "../utils/syncBattleState";
import { BattleEngineService } from "./BattleEngineService";
import { emitPendingSpecialResponse } from "../special-response/emitSpecialResponse";
import { BattleEngineTransformService } from "./BattleEngineTransformService";
import type { TokenInstance } from "@prisma/client";

export interface BattleEndedPayload {
    id: string;
    mapId: string;
    winnerTeam: string | null;
    winnerTokenIds: string[];
}

function resolveBattleWinner(
    tokens: readonly Pick<TokenInstance, "id" | "team" | "currentLife">[],
): Pick<BattleEndedPayload, "winnerTeam" | "winnerTokenIds"> {
    const livingTeams = new Set(
        tokens
            .filter((token) => token.currentLife > 0)
            .map((token) => token.team),
    );

    if (livingTeams.size !== 1) {
        return { winnerTeam: null, winnerTokenIds: [] };
    }

    const winnerTeam = [...livingTeams][0];
    return {
        winnerTeam,
        winnerTokenIds: tokens
            .filter((token) => token.team === winnerTeam)
            .map((token) => token.id),
    };
}

export function emitBattleRuntimeCleanup(
    battle: Pick<BattleEndedPayload, "id" | "mapId"> &
        Partial<Pick<BattleEndedPayload, "winnerTeam" | "winnerTokenIds">>,
): void {
    const { mapId } = battle;

    runtime.emit(SocketEvent.PENDING_ATTACK, null);
    runtime.emit(SocketEvent.PENDING_ESQUIVA_ROLL, null);
    runtime.emit(SocketEvent.FRONTEND_CARD_SELECTION, false);
    runtime.emit(SocketEvent.PENDING_CARD_RESOLUTION, null);
    runtime.emit(SocketEvent.FRONTEND_OFFENSIVE_CARD_SCORE, null);
    runtime.emit(SocketEvent.FRONTEND_OFFENSIVE_CARD_TEST_SCORE, null);
    runtime.emit(SocketEvent.PENDING_OFFENSIVE_CARD, { mapId });
    runtime.emit(SocketEvent.PENDING_FREE_RESPONSE, null);
    runtime.emit(SocketEvent.FRONTEND_ARMED_CARD, undefined);
    runtime.emit(SocketEvent.FRONTEND_AMBIENT_PIVOT_SELECTION, false);
    runtime.emit(SocketEvent.FRONTEND_SELECTED_PIVOTS, []);
    runtime.emit(SocketEvent.FRONTEND_SET_PREVIEW_CELLS, { mapId, value: [] });
    runtime.emit(SocketEvent.FRONTEND_IN_DEFENSE_RESOLUTION, false);
    runtime.emit(SocketEvent.FRONTEND_IN_TARGET_SELECTION, false);
    runtime.emit(SocketEvent.FRONTEND_SELECTED_TARGET, null);
    runtime.emit(SocketEvent.TOKEN_IN_AMBIENT_PIVOT_SELECTION, "");
    emitPendingSpecialResponse(mapId, null);
    runtime.emit(SocketEvent.BATTLE_ENDED, {
        ...battle,
        winnerTeam: battle.winnerTeam ?? null,
        winnerTokenIds: battle.winnerTokenIds ?? [],
    } satisfies BattleEndedPayload);
}



export class BattleEngineEndBattleService extends BattleEngineService {
    private readonly transformService = new BattleEngineTransformService();
    async execute(battleId: string) {

        if (!battleId) {
            throw new Error("Não foi passado uma string válida para o battleId.")
        }

        const battleState = await this.battleStateRepository.findById(battleId)

        if (!battleState) {
            throw new Error("O Estado de batalha não foi encontrado para ser encerrado.")
        }

        await this.transformService.restoreAllBeforeBattleEnd(battleId)
        const boardTokens = await this.tokenInstanceRepository.listByMapId(battleState.mapId)
        const winner = resolveBattleWinner(boardTokens);

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

        // 3. Limpa todos os estados auxiliares do frontend via socket.
        emitBattleRuntimeCleanup({ id: battleState.id, mapId, ...winner });

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
