import { BattleStateRepository } from "@/modules/battles/repositories/BattleStateRepository";

import { haveSomeMechanic } from "./haveSomeMechanic";

/**
 * Reports whether a token owns an active mechanic with the given definition name.
 * The comparison is exact and uses `MechanicInstance.sourceTokenId` as ownership.
 */
export async function tokenHaveMechanic(
    battleId: string,
    tokenId: string,
    mechanicName: string,
    battleStateRepository = new BattleStateRepository(),
): Promise<boolean> {
    return haveSomeMechanic(
        battleId,
        tokenId,
        [mechanicName],
        battleStateRepository,
    );
}
