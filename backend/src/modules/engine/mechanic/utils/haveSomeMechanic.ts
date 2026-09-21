import { BattleStateRepository } from "@/modules/battles/repositories/BattleStateRepository";

import type { MechanicInstance } from "../mechanics/MechanicInstance";

function isMechanicInstance(value: unknown): value is MechanicInstance {
    if (!value || typeof value !== "object") return false;

    const candidate = value as Partial<MechanicInstance>;
    return typeof candidate.name === "string"
        && typeof candidate.sourceTokenId === "string";
}

/**
 * Reports whether a token owns at least one active mechanic whose definition
 * name is included in `mechanicNames`.
 */
export async function haveSomeMechanic(
    battleId: string,
    tokenId: string,
    mechanicNames: readonly string[],
    battleStateRepository = new BattleStateRepository(),
): Promise<boolean> {
    const names = new Set(mechanicNames.filter(Boolean));
    if (!battleId || !tokenId || names.size === 0) return false;

    const battleState = await battleStateRepository.findById(battleId);
    if (!battleState || !Array.isArray(battleState.activeMechanics)) {
        return false;
    }

    return battleState.activeMechanics.some((mechanic) =>
        isMechanicInstance(mechanic)
        && mechanic.sourceTokenId === tokenId
        && names.has(mechanic.name),
    );
}
