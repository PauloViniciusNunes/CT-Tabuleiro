import { TokenTemplateRepository } from "@/modules/asset-library/tokens/repositories/TokenTemplateRepository";
import { MechanicEventType } from "../MechanicEventType";
import type { MechanicEvent } from "../events/MechanicEvent";
import type { MechanicInstance } from "../mechanics/MechanicInstance";
import type { EngineContext } from "../types/engineContext";
import { Behavior } from "./Behavior";
import { isOwnApplication, matchesFailedTest } from "./failedTestMetadata";

/** Deals the affected target its own maximum life after a configured failed test. */
export class SelfMaxLifeDamageOnFailedTestBehavior extends Behavior {
    constructor(private readonly tokenRepository = new TokenTemplateRepository()) {
        super();
    }

    lister(): MechanicEventType[] {
        return [
            MechanicEventType.ATTRIBUTE_TEST_RESOLVED,
            MechanicEventType.MECHANIC_APPLIED,
        ];
    }

    async execute(
        context: EngineContext,
        mechanic: MechanicInstance,
        event: MechanicEvent,
        data?: Record<string, unknown>,
    ): Promise<void> {
        if (
            event.type === MechanicEventType.ATTRIBUTE_TEST_RESOLVED &&
            mechanic.metadata.passive === true
        ) {
            const test = data?.test;
            if (!test || typeof test !== "object") return;
            const resolution = test as {
                sourceTokenId?: unknown;
                targetTokenId?: unknown;
                attribute?: unknown;
                succeeded?: unknown;
            };
            if (
                resolution.sourceTokenId !== mechanic.sourceTokenId ||
                resolution.succeeded !== false ||
                resolution.attribute !== mechanic.metadata.requiredFailedAttribute ||
                typeof resolution.targetTokenId !== "string"
            ) return;
            await this.dealMaxLifeDamage(context, mechanic, resolution.targetTokenId);
            return;
        }

        if (!isOwnApplication(mechanic, data)) return;
        if (!matchesFailedTest(mechanic)) {
            await context.operations.removeMechanic(
                mechanic.id,
                "failed-test-not-matched",
            );
            return;
        }

        const targetId = mechanic.metadata.targetId;
        if (typeof targetId !== "string") return;
        await this.dealMaxLifeDamage(context, mechanic, targetId);
        await context.operations.removeMechanic(
            mechanic.id,
            "self-max-life-damage-resolved",
        );
    }

    private async dealMaxLifeDamage(
        context: EngineContext,
        mechanic: MechanicInstance,
        targetId: string,
    ): Promise<void> {
        const target = await this.tokenRepository.findTokenTemplateById(targetId);
        if (!target) return;

        await context.operations.damage({
            sourceTokenId: targetId,
            targetTokenId: targetId,
            amount: target.maxLife,
            cause: "SELF_MAX_LIFE_DAMAGE",
            metadata: {
                attackType: "mechanic",
                mechanicInstanceId: mechanic.id,
            },
        });
    }
}
