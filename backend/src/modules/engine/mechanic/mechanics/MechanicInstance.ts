export interface MechanicInstance {
    id: string;
    definitionId: string;
    name: string;
    sourceTokenId: string;
    intensity: number;
    duration?: number;
    metadata: Record<string, unknown>;
}

function mechanicTargetId(mechanic: Readonly<MechanicInstance>): string {
    const targetId = mechanic.metadata.targetId;
    return typeof targetId === "string" ? targetId : mechanic.sourceTokenId;
}

export function mechanicUniquenessKey(
    mechanic: Readonly<MechanicInstance>,
): string {
    const targetId = mechanicTargetId(mechanic);

    if (mechanic.metadata.passive === true) {
        const sourceType = mechanic.metadata.passiveSourceType;
        const sourceId = mechanic.metadata.passiveSourceId;
        const sourceItemId = mechanic.metadata.sourceItemId;
        const passiveSource = typeof sourceId === "string"
            ? `${typeof sourceType === "string" ? sourceType : "generic"}:${sourceId}`
            : typeof sourceItemId === "string"
                ? `item:${sourceItemId}`
                : mechanic.id;
        return ["passive", passiveSource, mechanic.definitionId, targetId].join(":");
    }

    return ["active", mechanic.definitionId, targetId].join(":");
}

export function deduplicateMechanicInstances(
    mechanics: readonly MechanicInstance[],
): MechanicInstance[] {
    const identities = new Set<string>();

    return mechanics.filter((mechanic) => {
        const identity = mechanicUniquenessKey(mechanic);
        if (identities.has(identity)) return false;
        identities.add(identity);
        return true;
    });
}
