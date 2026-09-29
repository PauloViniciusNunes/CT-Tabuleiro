import { MechanicFactory } from "../mechanic/MechanicFactory";
import { MechanicRegistry } from "../mechanic/MechanicRegistry";
import type { MechanicInstance } from "../mechanic/mechanics/MechanicInstance";

export interface TokenPassiveSource {
    readonly id: string;
    readonly passiveMechanics: readonly string[];
}

function tokenPassiveIdentity(
    mechanic: MechanicInstance,
    tokenId: string,
): string | null {
    const sourceType = mechanic.metadata.passiveSourceType;
    const sourceId = mechanic.metadata.passiveSourceId;

    if (
        mechanic.sourceTokenId !== tokenId ||
        mechanic.metadata.passive !== true ||
        sourceType !== "token" ||
        sourceId !== tokenId
    ) {
        return null;
    }

    return mechanic.definitionId;
}

/**
 * Reconciles only passives owned directly by the token. Item passives and
 * mechanics applied by other runtime sources are preserved.
 */
export function reconcileTokenPassives(
    activeMechanics: readonly MechanicInstance[],
    token: TokenPassiveSource,
): MechanicInstance[] {
    const desiredPassives = new Map<string, string>();

    for (const tag of new Set(token.passiveMechanics)) {
        if (tag === "none" || tag === "neutro") {
            continue;
        }

        const definition = MechanicRegistry.map(tag);
        desiredPassives.set(definition.id, tag);
    }

    const retainedPassives = new Set<string>();
    const reconciled = activeMechanics.filter((mechanic) => {
        const identity = tokenPassiveIdentity(mechanic, token.id);

        if (identity === null) {
            return true;
        }

        if (!desiredPassives.has(identity) || retainedPassives.has(identity)) {
            return false;
        }

        retainedPassives.add(identity);
        return true;
    });

    for (const [definitionId, tag] of desiredPassives) {
        if (retainedPassives.has(definitionId)) {
            continue;
        }

        reconciled.push(MechanicFactory.create(token.id, tag, {
            targetId: token.id,
            passive: true,
            passiveSourceType: "token",
            passiveSourceId: token.id,
            sourcePassiveMechanic: tag,
        }));
    }

    return reconciled;
}
