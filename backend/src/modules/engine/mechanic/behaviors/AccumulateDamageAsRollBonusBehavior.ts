import { BattleSetter } from "../../context/BattleSetter";
import { MechanicEventType } from "../MechanicEventType";
import type { MechanicEvent } from "../events/MechanicEvent";
import type { MechanicInstance } from "../mechanics/MechanicInstance";
import type { EngineContext } from "../types/engineContext";
import { Behavior } from "./Behavior";

/** Accumulates matching dealt damage as a generic future roll bonus. */
export class AccumulateDamageAsRollBonusBehavior extends Behavior {
    constructor(private readonly battleSetter = new BattleSetter()) {
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
        const damage = operation as {
            amount?: unknown;
            sourceTokenId?: unknown;
            cause?: unknown;
            metadata?: Readonly<Record<string, unknown>>;
        };
        const requiredAttackType = mechanic.metadata.requiredAttackType;
        if (
            damage.sourceTokenId !== mechanic.sourceTokenId ||
            typeof damage.amount !== "number" ||
            damage.amount <= 0 ||
            damage.cause === "REPEATED_DAMAGE" ||
            (typeof requiredAttackType === "string" &&
                damage.metadata?.attackType !== requiredAttackType)
        ) return;
        const amount = damage.amount;

        const metadataKey = typeof mechanic.metadata.rollBonusMetadataKey === "string"
            ? mechanic.metadata.rollBonusMetadataKey
            : "accumulatedRollBonus";
        await this.battleSetter.updateMechanicInstance(
            context.battleId,
            mechanic.id,
            (current) => {
                const currentValue = current.metadata[metadataKey];
                return {
                    ...current,
                    metadata: {
                        ...current.metadata,
                        [metadataKey]: (typeof currentValue === "number" ? currentValue : 0) + amount,
                    },
                };
            },
        );
    }
}
