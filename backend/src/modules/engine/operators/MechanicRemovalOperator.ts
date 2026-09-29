import { BattleStateRepository } from "@/modules/battles/repositories/BattleStateRepository";
import { BattleSetter } from "../context/BattleSetter";
import { MechanicPreRemovedEvent } from "../mechanic/events/MechanicPreRemovedEvent";
import type { MechanicInstance } from "../mechanic/mechanics/MechanicInstance";
import { routeSpecialFields } from "../mechanic/utils/routeSpecialFields";
import { Operator, type OperatorRuntime } from "./Operator";
import type { OperationContext, OperationIntent } from "./OperationContext";

export interface MechanicRemovalIntent extends OperationIntent {
    readonly mechanicId: string;
    readonly reason?: string;
}

export interface MechanicRemovalData extends OperationContext {
    readonly mechanicId: string;
    readonly reason: string;
    readonly mechanic?: Readonly<MechanicInstance>;
    readonly removed: boolean;
}

export type MechanicRemovalInput = MechanicRemovalIntent & {
    readonly operationId?: string;
};

/** Removes one active MechanicInstance while preserving pre-removal events. */
export class MechanicRemovalOperator extends Operator<
    MechanicRemovalInput,
    MechanicRemovalData
> {
    constructor(
        runtime: OperatorRuntime,
        private readonly battleStateRepository = new BattleStateRepository(),
        private readonly battleSetter = new BattleSetter(),
    ) {
        super(runtime);
    }

    async execute(input: MechanicRemovalInput): Promise<MechanicRemovalData> {
        if (!input.battleId || !input.mechanicId) {
            throw new Error("A remoção de mecânica exige batalha e instância.");
        }

        const reason = input.reason ?? "explicit-removal";
        const operationId = input.operationId ?? crypto.randomUUID();
        const battleState = await this.battleStateRepository.findById(input.battleId);
        if (!battleState) {
            throw new Error("A batalha da mecânica a remover não foi encontrada.");
        }

        const activeMechanics = Array.isArray(battleState.activeMechanics)
            ? battleState.activeMechanics as unknown as MechanicInstance[]
            : [];
        const mechanic = activeMechanics.find(
            (candidate) => candidate.id === input.mechanicId,
        );

        if (!mechanic) {
            return {
                ...input,
                operationId,
                reason,
                removed: false,
            };
        }

        const mechanicSnapshot = structuredClone(mechanic);
        await this.runtime.dispatchEvent(
            input.battleId,
            new MechanicPreRemovedEvent(mechanicSnapshot, reason),
            {
                mechanic: mechanicSnapshot,
                mechanicId: mechanicSnapshot.id,
                reason,
            },
        );

        const liveBattleState = await this.battleStateRepository.findById(input.battleId);
        const stillActive = Array.isArray(liveBattleState?.activeMechanics) &&
            liveBattleState.activeMechanics.some(
                (candidate) =>
                    typeof candidate === "object" &&
                    candidate !== null &&
                    (candidate as { id?: unknown }).id === input.mechanicId,
            );

        if (!stillActive) {
            return {
                ...input,
                operationId,
                reason,
                mechanic: mechanicSnapshot,
                removed: false,
            };
        }

        await this.battleSetter.removeMechanicInstance(
            input.battleId,
            input.mechanicId,
        );
        await routeSpecialFields(input.battleId, mechanicSnapshot);

        return {
            ...input,
            operationId,
            reason,
            mechanic: mechanicSnapshot,
            removed: true,
        };
    }
}
