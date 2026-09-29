import type { TokenInstance } from "@prisma/client";

import { TokenRepository } from "@/modules/tokens/repositories/TokenRepository";
import type {
    TransformationOption,
    TransformationRuntimeStates,
} from "./types";

export async function listTransformationOptions(
    token: TokenInstance,
    states: TransformationRuntimeStates,
    repository = new TokenRepository(),
): Promise<TransformationOption[]> {
    const state = states[token.id];

    if (token.isTransformation && token.baseTokenId) {
        const base = await repository.findById(token.baseTokenId);
        if (!base) return [];
        return [{
            templateId: base.id,
            name: `Voltar para ${base.name}`,
            imageUrl: base.imageUrl,
            direction: "revert",
            durationMode: "persistent",
            durationRounds: null,
            rechargeRounds: token.transformationRecharge,
            remainingRecharge: 0,
        }];
    }

    if (!token.templateTokenId) return [];
    const transformations = await repository.findManyByBaseTokenId(
        token.templateTokenId,
    );

    return transformations
        .filter((candidate) => candidate.userId === token.userId)
        .map((candidate) => ({
            templateId: candidate.id,
            name: candidate.name,
            imageUrl: candidate.imageUrl,
            direction: "transform" as const,
            durationMode: candidate.transformationDurationMode === "rounds"
                ? "rounds" as const
                : "persistent" as const,
            durationRounds: candidate.transformationDurationMode === "rounds"
                ? candidate.transformationDurationRounds
                : null,
            rechargeRounds: Math.max(0, candidate.transformationRecharge),
            remainingRecharge:
                state?.cooldowns[candidate.id]?.remainingRounds ?? 0,
        }));
}
