import { TokenTemplateRepository } from "@/modules/asset-library/tokens/repositories/TokenTemplateRepository";
import { BattleStateRepository } from "@/modules/battles/repositories/BattleStateRepository";
import { MapRepository } from "@/modules/maps/repositories/MapRepository";
import { TokenMovedEvent } from "../mechanic/events/TokenMovedEvent";
import { assertNaturalMovement } from "../utils/naturalMovement";
import { syncBattleState } from "../utils/syncBattleState";
import type { InterceptableData } from "../mechanic/interceptors/Interceptor";
import { InterceptorType } from "../mechanic/interceptors/InterceptorType";
import { Operator, type OperatorRuntime } from "./Operator";
import type { OperationContext, OperationIntent } from "./OperationContext";

export interface GridPosition {
    readonly col: number;
    readonly row: number;
}

export interface MovementIntent extends OperationIntent {
    readonly tokenId: string;
    readonly to: GridPosition;
}

export interface MovementData extends OperationContext, InterceptableData {
    readonly tokenId: string;
    readonly mapId: string;
    readonly from: GridPosition;
    readonly to: GridPosition;
}

export type MovementInput = MovementIntent & {
    readonly operationId?: string;
};

function assertPosition(position: GridPosition, maxCols: number, maxRows: number): void {
    if (!Number.isInteger(position.col) || !Number.isInteger(position.row)) {
        throw new Error("A posição de destino precisa usar coordenadas inteiras.");
    }

    if (position.col < 0 || position.row < 0 || position.col >= maxCols || position.row >= maxRows) {
        throw new Error("A posição de destino está fora dos limites do mapa.");
    }
}

/** Moves a board token only after mechanics have had a chance to intervene. */
export class MovementOperator extends Operator<MovementInput, MovementData> {
    constructor(
        runtime: OperatorRuntime,
        private readonly battleStateRepository = new BattleStateRepository(),
        private readonly tokenRepository = new TokenTemplateRepository(),
        private readonly mapRepository = new MapRepository(),
    ) {
        super(runtime);
    }

    async execute(input: MovementInput): Promise<MovementData> {
        if (!input.battleId || !input.tokenId) {
            throw new Error("A intenção de movimento precisa de batalha e token.");
        }

        const battleState = await this.battleStateRepository.findById(input.battleId);
        if (!battleState) {
            throw new Error("Não foi possível encontrar a batalha do movimento.");
        }

        const [token, map] = await Promise.all([
            this.tokenRepository.findTokenTemplateById(input.tokenId),
            this.mapRepository.findMapById(battleState.mapId),
        ]);

        if (!token || token.mapId !== battleState.mapId) {
            throw new Error("O token movimentado não pertence ao mapa da batalha.");
        }

        if (!map) {
            throw new Error("Não foi possível encontrar o mapa da batalha.");
        }

        assertPosition(input.to, map.cols, map.rows);

        const from = Object.freeze({ col: token.col, row: token.row });
        const movement = await this.runtime.intercept(InterceptorType.MOVEMENT, {
            ...input,
            operationId: input.operationId ?? crypto.randomUUID(),
            mapId: battleState.mapId,
            from,
            to: Object.freeze({ ...input.to }),
            cancelled: false,
        }, input.battleId);

        if (movement.cancelled) {
            return movement;
        }

        assertPosition(movement.to, map.cols, map.rows);
        if (battleState.status === "In Battle") {
            assertNaturalMovement(from, movement.to, token.naturalMovement);
        }

        const resolved: MovementData = {
            ...movement,
            // Token, map and origin are facts of the operation, not interceptor choices.
            tokenId: token.id,
            mapId: battleState.mapId,
            from,
        };

        if (resolved.from.col === resolved.to.col && resolved.from.row === resolved.to.row) {
            return resolved;
        }

        if (battleState.status === "In Battle") {
            await this.tokenRepository.moveOnceInBattle(resolved.battleId, resolved.tokenId, resolved.to);
        } else {
            await this.tokenRepository.update(resolved.tokenId, {
                col: resolved.to.col,
                row: resolved.to.row,
            });
        }

        await this.runtime.dispatchEvent(
            resolved.battleId,
            new TokenMovedEvent(resolved),
            { movement: resolved },
        );

        if (battleState.status === "In Battle") {
            await syncBattleState(resolved.battleId);
        }

        return resolved;
    }
}
