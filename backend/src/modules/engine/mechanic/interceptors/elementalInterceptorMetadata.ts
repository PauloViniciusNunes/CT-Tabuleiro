import type { TokenElementProfile } from "../../utils/elementalAffinity";
import { normalizeElement, profileHasElement } from "../../utils/elementalAffinity";
import type { MechanicInstance } from "../mechanics/MechanicInstance";

export function metadataString(
    mechanic: Readonly<MechanicInstance>,
    key: string,
): string | undefined {
    const value = mechanic.metadata[key];
    return typeof value === "string" && value.trim() ? value : undefined;
}

export function metadataElementList(
    mechanic: Readonly<MechanicInstance>,
    key: string,
): string[] {
    const value = mechanic.metadata[key];
    const values = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];

    return [...new Set(
        values
            .filter((entry): entry is string => typeof entry === "string" && !!entry.trim())
            .map(normalizeElement),
    )];
}

export function metadataMultiplier(
    mechanic: Readonly<MechanicInstance>,
    key: string,
    fallback: number,
): number {
    const value = mechanic.metadata[key];
    return typeof value === "number" && Number.isFinite(value) && value >= 0
        ? value
        : fallback;
}

export function ownerMeetsArsenalRequirement(
    profile: TokenElementProfile | undefined,
    mechanic: Readonly<MechanicInstance>,
): boolean {
    if (!profile || profile.id !== mechanic.sourceTokenId) {
        return false;
    }

    const requiredElement = metadataString(mechanic, "requiredArsenalElement");
    return !requiredElement || profileHasElement(profile, requiredElement);
}
