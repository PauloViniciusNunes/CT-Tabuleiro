import { TokenTemplateRepository } from "@/modules/asset-library/tokens/repositories/TokenTemplateRepository";
import { BattleStateRepository } from "@/modules/battles/repositories/BattleStateRepository";
import { BattleSetter } from "../../context/BattleSetter";
import { MechanicEventType } from "../MechanicEventType";
import type { MechanicEvent } from "../events/MechanicEvent";
import type { MechanicInstance } from "../mechanics/MechanicInstance";
import type { EngineContext } from "../types/engineContext";
import { Behavior } from "./Behavior";

type DamageOperation = {
    readonly amount?: unknown;
    readonly sourceTokenId?: unknown;
    readonly targetTokenId?: unknown;
    readonly cause?: unknown;
    readonly operationId?: unknown;
    readonly metadata?: Readonly<Record<string, unknown>>;
};

function finitePositiveNumber(value: unknown): number | undefined {
    return typeof value === "number" && Number.isFinite(value) && value > 0
        ? value
        : undefined;
}

/**
 * Applies a configured mechanic to a damaged target, or accumulates its
 * periodic damage when the same source has already applied that mechanic.
 *
 * The triggering conditions and the amount are entirely driven by the source
 * MechanicInstance metadata, so this behavior is not tied to an element,
 * item, spell or concrete status effect.
 */
export class ApplyOrAccumulateMechanicOnDamageBehavior extends Behavior {
    constructor(
        private readonly battleStateRepository = new BattleStateRepository(),
        private readonly tokenRepository = new TokenTemplateRepository(),
        private readonly battleSetter = new BattleSetter(),
    ) {
        super();
    }

    lister(): MechanicEventType[] {
        return [MechanicEventType.DAMAGE_RECEIVED];
    }

    async execute(
        context: EngineContext,
        mechanic: MechanicInstance,
        _event: MechanicEvent,
        data?: Record<string, unknown>,
    ): Promise<void> {
        const operation = data?.operation;
        if (!operation || typeof operation !== "object") return;

        const damage = operation as DamageOperation;
        const tag = mechanic.metadata.mechanicApplyTag;
        const targetTokenId = damage.targetTokenId;
        const requiredAttackType = mechanic.metadata.requiredAttackType;
        const requiresCardDamage = mechanic.metadata.requiredCardDamage === true;

        if (
            typeof tag !== "string" ||
            !tag.trim() ||
            damage.sourceTokenId !== mechanic.sourceTokenId ||
            typeof targetTokenId !== "string" ||
            !finitePositiveNumber(damage.amount) ||
            damage.cause === "TURN_MECHANIC_DAMAGE" ||
            damage.cause === "REPEATED_DAMAGE" ||
            (typeof requiredAttackType === "string" &&
                damage.metadata?.attackType !== requiredAttackType) ||
            (requiresCardDamage && typeof damage.metadata?.cardId !== "string")
        ) {
            return;
        }

        const additionalDamage = await this.resolveConfiguredIntensity(mechanic);
        if (additionalDamage <= 0) return;

        const battle = await this.battleStateRepository.findById(context.battleId);
        const activeMechanics = Array.isArray(battle?.activeMechanics)
            ? battle.activeMechanics as unknown as MechanicInstance[]
            : [];
        const existing = activeMechanics.find((candidate) =>
            candidate.name === tag &&
            candidate.sourceTokenId === mechanic.sourceTokenId &&
            candidate.metadata.targetId === targetTokenId,
        );

        if (existing) {
            await this.battleSetter.updateMechanicInstance(
                context.battleId,
                existing.id,
                (current) => {
                    const currentDamage = finitePositiveNumber(current.metadata.periodicDamage)
                        ?? finitePositiveNumber(current.intensity)
                        ?? 0;
                    const periodicDamage = currentDamage + additionalDamage;

                    return {
                        ...current,
                        intensity: periodicDamage,
                        duration: typeof mechanic.duration === "number"
                            ? mechanic.duration
                            : current.duration,
                        metadata: {
                            ...current.metadata,
                            targetId: targetTokenId,
                            periodicDamage,
                        },
                    };
                },
            );
            return;
        }

        await context.operations.applyMechanic({
            sourceTokenId: mechanic.sourceTokenId,
            tag,
            parentOperationId: typeof damage.operationId === "string"
                ? damage.operationId
                : undefined,
            cause: "DAMAGE_STATUS_APPLICATION",
            mechanicMetadata: {
                targetId: targetTokenId,
                intensity: additionalDamage,
                periodicDamage: additionalDamage,
                duration: typeof mechanic.duration === "number"
                    ? mechanic.duration
                    : undefined,
            },
        });
    }

    private async resolveConfiguredIntensity(
        mechanic: Readonly<MechanicInstance>,
    ): Promise<number> {
        const configuration = mechanic.metadata.sourceLevelIntensity;
        if (!configuration || typeof configuration !== "object") {
            return finitePositiveNumber(mechanic.metadata.appliedIntensity)
                ?? finitePositiveNumber(mechanic.intensity)
                ?? 0;
        }

        const sourceToken = await this.tokenRepository.findTokenTemplateById(
            mechanic.sourceTokenId,
        );
        if (!sourceToken) return 0;

        const scale = configuration as {
            levelOffset?: unknown;
            minimumLevel?: unknown;
            multiplier?: unknown;
        };
        const levelOffset = typeof scale.levelOffset === "number" && Number.isFinite(scale.levelOffset)
            ? scale.levelOffset
            : 0;
        const minimumLevel = finitePositiveNumber(scale.minimumLevel) ?? 1;
        const multiplier = finitePositiveNumber(scale.multiplier) ?? 1;

        return Math.floor(
            Math.max((sourceToken.level ?? 0) - levelOffset, minimumLevel) * multiplier,
        );
    }
}
