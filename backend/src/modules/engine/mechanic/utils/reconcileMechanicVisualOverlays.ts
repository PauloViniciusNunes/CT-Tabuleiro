import { MechanicRegistry } from "../MechanicRegistry";
import type { MechanicInstance } from "../mechanics/MechanicInstance";
import type { VisualOverlay } from "../types/visualOverlays";

interface MechanicVisualGroup {
    readonly overlay: VisualOverlay;
    readonly mechanicInstanceIds: string[];
}

function groupMechanicVisuals(
    mechanics: readonly MechanicInstance[],
    tokenId: string,
): Map<string, MechanicVisualGroup> {
    const groups = new Map<string, MechanicVisualGroup>();

    for (const mechanic of mechanics) {
        if (mechanic.metadata.targetId !== tokenId) {
            continue;
        }

        const visual = MechanicRegistry
            .findDefinition(mechanic.definitionId)
            .getVisualOverlay();

        if (!visual) {
            continue;
        }

        const current = groups.get(visual.type);

        if (current) {
            current.mechanicInstanceIds.push(mechanic.id);
            continue;
        }

        groups.set(visual.type, {
            overlay: visual,
            mechanicInstanceIds: [mechanic.id],
        });
    }

    return groups;
}

/**
 * Makes token overlays reflect its active mechanics while preserving visuals
 * owned by effects and other frontend features.
 */
export function reconcileMechanicVisualOverlays(
    currentOverlays: readonly VisualOverlay[],
    previousMechanics: readonly MechanicInstance[],
    activeMechanics: readonly MechanicInstance[],
    tokenId: string,
): VisualOverlay[] {
    const previousVisuals = groupMechanicVisuals(previousMechanics, tokenId);
    const activeVisuals = groupMechanicVisuals(activeMechanics, tokenId);
    const mechanicVisualTypes = new Set([
        ...previousVisuals.keys(),
        ...activeVisuals.keys(),
        // Mechanic overlays created by the engine carry their owning instance
        // IDs. Keep treating an orphaned one as mechanic-owned even after its
        // definition has disappeared from activeMechanics, so a later sync can
        // remove stale visuals left by an interrupted or older removal flow.
        ...currentOverlays
            .filter((overlay) => Array.isArray(overlay.mechanicInstanceIds))
            .map((overlay) => overlay.type),
    ]);

    const nonMechanicOverlays = currentOverlays.filter(
        (overlay) => !mechanicVisualTypes.has(overlay.type),
    );

    const mechanicOverlays = [...activeVisuals.values()].map((group) => {
        const existing = currentOverlays.find(
            (overlay) => overlay.type === group.overlay.type,
        );

        return {
            ...group.overlay,
            id: existing?.id ?? group.overlay.id,
            mechanicInstanceIds: [...group.mechanicInstanceIds],
        };
    });

    return [...nonMechanicOverlays, ...mechanicOverlays];
}
