export interface TransformationCooldown {
    remainingRounds: number;
    startedAtTurnVersion: number;
}

export interface ActiveTransformation {
    baseTemplateId: string;
    transformationTemplateId: string;
    remainingRounds: number | null;
    rechargeRounds: number;
}

export interface TokenTransformationRuntimeState {
    active?: ActiveTransformation;
    cooldowns: Record<string, TransformationCooldown>;
}

export type TransformationRuntimeStates = Record<
    string,
    TokenTransformationRuntimeState
>;

export interface TransformationOption {
    templateId: string;
    name: string;
    imageUrl: string;
    direction: "transform" | "revert";
    durationMode: "persistent" | "rounds";
    durationRounds: number | null;
    rechargeRounds: number;
    remainingRecharge: number;
}

export interface PendingTransformationResolution {
    requestId: string;
    tokenId: string;
    ownerId: string;
    options: TransformationOption[];
}

export function parseTransformationStates(
    value: unknown,
): TransformationRuntimeStates {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return {};
    }

    const result: TransformationRuntimeStates = {};
    for (const [tokenId, raw] of Object.entries(value)) {
        if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
        const candidate = raw as Record<string, unknown>;
        const rawCooldowns = candidate.cooldowns;
        const cooldowns: Record<string, TransformationCooldown> = {};

        if (rawCooldowns && typeof rawCooldowns === "object" && !Array.isArray(rawCooldowns)) {
            for (const [templateId, cooldown] of Object.entries(rawCooldowns)) {
                if (!cooldown || typeof cooldown !== "object" || Array.isArray(cooldown)) continue;
                const record = cooldown as Record<string, unknown>;
                if (typeof record.remainingRounds !== "number") continue;
                cooldowns[templateId] = {
                    remainingRounds: Math.max(0, Math.floor(record.remainingRounds)),
                    startedAtTurnVersion: typeof record.startedAtTurnVersion === "number"
                        ? Math.floor(record.startedAtTurnVersion)
                        : 0,
                };
            }
        }

        const state: TokenTransformationRuntimeState = { cooldowns };
        const active = candidate.active;
        if (active && typeof active === "object" && !Array.isArray(active)) {
            const record = active as Record<string, unknown>;
            if (
                typeof record.baseTemplateId === "string" &&
                typeof record.transformationTemplateId === "string"
            ) {
                state.active = {
                    baseTemplateId: record.baseTemplateId,
                    transformationTemplateId: record.transformationTemplateId,
                    remainingRounds: typeof record.remainingRounds === "number"
                        ? Math.max(0, Math.floor(record.remainingRounds))
                        : null,
                    rechargeRounds: typeof record.rechargeRounds === "number"
                        ? Math.max(0, Math.floor(record.rechargeRounds))
                        : 0,
                };
            }
        }
        result[tokenId] = state;
    }
    return result;
}
