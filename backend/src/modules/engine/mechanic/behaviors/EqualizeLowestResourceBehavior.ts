import { TokenTemplateRepository } from "@/modules/asset-library/tokens/repositories/TokenTemplateRepository";
import { BattleStateRepository } from "@/modules/battles/repositories/BattleStateRepository";
import { BattleSetter } from "../../context/BattleSetter";
import { MechanicEventType } from "../MechanicEventType";
import type { MechanicEvent } from "../events/MechanicEvent";
import type { MechanicInstance } from "../mechanics/MechanicInstance";
import type { EngineContext } from "../types/engineContext";
import { Behavior } from "./Behavior";
import { isOwnApplication, matchesFailedTest } from "./failedTestMetadata";

/** Equalizes a pair of failed targets to the lowest configured resource. */
export class EqualizeLowestResourceBehavior extends Behavior {
    constructor(
        private readonly battleRepository = new BattleStateRepository(),
        private readonly tokenRepository = new TokenTemplateRepository(),
        private readonly battleSetter = new BattleSetter(),
    ) {
        super();
    }

    lister(): MechanicEventType[] {
        return [
            MechanicEventType.MECHANIC_APPLIED,
            MechanicEventType.ATTRIBUTE_TEST_RESOLVED,
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
            await this.processPassiveTest(context, mechanic, data);
            return;
        }

        if (!isOwnApplication(mechanic, data) || !matchesFailedTest(mechanic)) return;

        const resolutionId = mechanic.metadata.resolutionId;
        const targetId = mechanic.metadata.targetId;
        const resource = mechanic.metadata.resource;
        if (
            typeof resolutionId !== "string" ||
            typeof targetId !== "string" ||
            (resource !== "life" && resource !== "mana")
        ) return;

        const battle = await this.battleRepository.findById(context.battleId);
        const activeMechanics = Array.isArray(battle?.activeMechanics)
            ? battle.activeMechanics as unknown as MechanicInstance[]
            : [];
        const pair = activeMechanics.filter((candidate) =>
            candidate.definitionId === mechanic.definitionId &&
            candidate.sourceTokenId === mechanic.sourceTokenId &&
            candidate.metadata.resolutionId === resolutionId &&
            candidate.metadata.testSucceeded === false &&
            typeof candidate.metadata.targetId === "string",
        );
        const distinctTargets = [...new Set(
            pair.map((candidate) => candidate.metadata.targetId as string),
        )];
        if (distinctTargets.length < 2) return;

        const selectedTargets = distinctTargets.slice(0, 2);
        const tokens = await Promise.all(
            selectedTargets.map((id) => this.tokenRepository.findTokenTemplateById(id)),
        );
        if (tokens.some((token) => !token)) return;

        const values = tokens.map((token) => resource === "life"
            ? token!.currentLife
            : token!.currentMana,
        );
        const lowest = Math.min(...values);

        await Promise.all(selectedTargets.map((id) =>
            context.operations.setResources({
                targetTokenId: id,
                currentLife: resource === "life" ? lowest : undefined,
                currentMana: resource === "mana" ? lowest : undefined,
                cause: "LOWEST_RESOURCE_EQUALIZATION",
                metadata: { resource, resolutionId },
            }),
        ));

        const consumedIds = new Set(pair
            .filter((candidate) => selectedTargets.includes(candidate.metadata.targetId as string))
            .map((candidate) => candidate.id));
        for (const mechanicId of consumedIds) {
            await context.operations.removeMechanic(
                mechanicId,
                "lowest-resource-equalization-consumed",
            );
        }
    }

    private async processPassiveTest(
        context: EngineContext,
        mechanic: MechanicInstance,
        data?: Record<string, unknown>,
    ): Promise<void> {
        const test = data?.test;
        if (!test || typeof test !== "object") return;
        const resolution = test as {
            resolutionId?: unknown;
            sourceTokenId?: unknown;
            targetTokenId?: unknown;
            attribute?: unknown;
            succeeded?: unknown;
        };
        if (
            resolution.sourceTokenId !== mechanic.sourceTokenId ||
            resolution.succeeded !== false ||
            resolution.attribute !== mechanic.metadata.requiredFailedAttribute ||
            typeof resolution.resolutionId !== "string" ||
            typeof resolution.targetTokenId !== "string"
        ) return;

        const pendingGroups = mechanic.metadata.pendingTargetGroups;
        const groups = pendingGroups && typeof pendingGroups === "object" && !Array.isArray(pendingGroups)
            ? { ...pendingGroups as Record<string, unknown> }
            : {};
        const previousTargets = Array.isArray(groups[resolution.resolutionId])
            ? (groups[resolution.resolutionId] as unknown[])
                .filter((id): id is string => typeof id === "string")
            : [];
        const targets = [...new Set([...previousTargets, resolution.targetTokenId])];

        if (targets.length < 2) {
            groups[resolution.resolutionId] = targets;
            await this.battleSetter.updateMechanicInstance(
                context.battleId,
                mechanic.id,
                (current) => ({
                    ...current,
                    metadata: { ...current.metadata, pendingTargetGroups: groups },
                }),
            );
            return;
        }

        const resource = mechanic.metadata.resource;
        if (resource !== "life" && resource !== "mana") return;
        const selectedTargets = targets.slice(0, 2);
        const tokens = await Promise.all(
            selectedTargets.map((id) => this.tokenRepository.findTokenTemplateById(id)),
        );
        if (tokens.some((token) => !token)) return;
        const lowest = Math.min(...tokens.map((token) => resource === "life"
            ? token!.currentLife
            : token!.currentMana,
        ));

        await Promise.all(selectedTargets.map((id) => context.operations.setResources({
            targetTokenId: id,
            currentLife: resource === "life" ? lowest : undefined,
            currentMana: resource === "mana" ? lowest : undefined,
            cause: "LOWEST_RESOURCE_EQUALIZATION",
            metadata: { resource, resolutionId: resolution.resolutionId },
        })));

        delete groups[resolution.resolutionId];
        await this.battleSetter.updateMechanicInstance(
            context.battleId,
            mechanic.id,
            (current) => ({
                ...current,
                metadata: { ...current.metadata, pendingTargetGroups: groups },
            }),
        );
    }
}
