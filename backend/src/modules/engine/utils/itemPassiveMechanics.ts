import { MechanicFactory } from "../mechanic/MechanicFactory";
import { MechanicRegistry } from "../mechanic/MechanicRegistry";
import type { MechanicInstance } from "../mechanic/mechanics/MechanicInstance";

export interface EquippedItemPassiveSource {
    readonly id: string;
    readonly name: string;
    readonly passiveMechanics: readonly string[];
}

interface DesiredItemPassive {
    readonly item: EquippedItemPassiveSource;
    readonly tag: string;
}

function passiveIdentity(itemId: string, definitionId: string): string {
    return `${itemId}:${definitionId}`;
}

function itemPassiveIdentity(
    mechanic: MechanicInstance,
    tokenId: string,
): string | null {
    const sourceItemId = mechanic.metadata.sourceItemId;

    if (
        mechanic.sourceTokenId !== tokenId ||
        mechanic.metadata.passive !== true ||
        typeof sourceItemId !== "string"
    ) {
        return null;
    }

    return passiveIdentity(sourceItemId, mechanic.definitionId);
}

/**
 * Reconciles only item-owned passive mechanics for one token. Mechanics from
 * cards, token elements, other tokens and other sources are left untouched.
 */
export function reconcileEquippedItemPassives(
    activeMechanics: readonly MechanicInstance[],
    tokenId: string,
    equippedItems: readonly EquippedItemPassiveSource[],
): MechanicInstance[] {
    const desiredPassives = new Map<string, DesiredItemPassive>();

    for (const item of equippedItems) {
        for (const tag of new Set(item.passiveMechanics)) {
            if (tag === "none" || tag === "neutro") {
                continue;
            }

            const definition = MechanicRegistry.map(tag);
            const identity = passiveIdentity(item.id, definition.id);
            desiredPassives.set(identity, {
                item,
                tag,
            });
        }
    }

    const retainedPassives = new Set<string>();
    const reconciled = activeMechanics.filter((mechanic) => {
        const identity = itemPassiveIdentity(mechanic, tokenId);

        if (identity === null) {
            return true;
        }

        if (!desiredPassives.has(identity) || retainedPassives.has(identity)) {
            return false;
        }

        retainedPassives.add(identity);
        return true;
    });

    for (const [identity, desired] of desiredPassives) {
        if (retainedPassives.has(identity)) {
            continue;
        }

        reconciled.push(MechanicFactory.create(tokenId, desired.tag, {
            targetId: tokenId,
            passive: true,
            sourceItemId: desired.item.id,
            sourceItemName: desired.item.name,
            sourcePassiveMechanic: desired.tag,
        }));
    }

    return reconciled;
}
