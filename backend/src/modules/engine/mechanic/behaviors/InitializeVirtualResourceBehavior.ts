import { TokenTemplateRepository } from "@/modules/asset-library/tokens/repositories/TokenTemplateRepository";
import { BattleSetter } from "../../context/BattleSetter";
import { MechanicEventType } from "../MechanicEventType";
import { MechanicAppliedEvent } from "../events/MechanicAppliedEvent";
import type { MechanicEvent } from "../events/MechanicEvent";
import type { MechanicInstance } from "../mechanics/MechanicInstance";
import type { EngineContext } from "../types/engineContext";
import { Behavior } from "./Behavior";

type VirtualResourceSourceField = "maxLife" | "maxMana";

function configuredString(
    metadata: Readonly<Record<string, unknown>>,
    key: string,
): string | null {
    const value = metadata[key];
    return typeof value === "string" && value ? value : null;
}

/** Initializes mechanic metadata from a maximum resource on its affected token. */
export class InitializeVirtualResourceBehavior extends Behavior {
    constructor(
        private readonly battleSetter = new BattleSetter(),
        private readonly tokenRepository = new TokenTemplateRepository(),
    ) {
        super();
    }

    lister(): MechanicEventType[] {
        return [MechanicEventType.MECHANIC_APPLIED];
    }

    async execute(
        context: EngineContext,
        mechanic: MechanicInstance,
        event: MechanicEvent,
    ): Promise<void> {
        if (!(event instanceof MechanicAppliedEvent)) return;
        if (event.application.instance?.id !== mechanic.id) return;

        const sourceField = configuredString(
            mechanic.metadata,
            "virtualResourceSourceField",
        ) as VirtualResourceSourceField | null;
        const currentKey = configuredString(
            mechanic.metadata,
            "virtualResourceCurrentMetadataKey",
        );
        const maxKey = configuredString(
            mechanic.metadata,
            "virtualResourceMaxMetadataKey",
        );
        if (
            (sourceField !== "maxLife" && sourceField !== "maxMana") ||
            !currentKey ||
            !maxKey
        ) return;

        const targetTokenId = typeof mechanic.metadata.targetId === "string"
            ? mechanic.metadata.targetId
            : mechanic.sourceTokenId;
        const token = await this.tokenRepository.findTokenTemplateById(targetTokenId);
        if (!token) {
            throw new Error("O token do recurso virtual não foi encontrado.");
        }

        const maximum = token[sourceField];
        if (!Number.isFinite(maximum) || maximum <= 0) return;

        await this.battleSetter.updateMechanicInstance(
            context.battleId,
            mechanic.id,
            (current) => ({
                ...current,
                metadata: {
                    ...current.metadata,
                    [currentKey]: maximum,
                    [maxKey]: maximum,
                },
            }),
        );
    }
}
