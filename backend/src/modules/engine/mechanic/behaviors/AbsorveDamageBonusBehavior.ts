import { BattleSetter } from "../../context/BattleSetter";
import { Debugger } from "../../utils/Debug";
import { MechanicEventType } from "../MechanicEventType";
import type { MechanicEvent } from "../events/MechanicEvent";
import type { MechanicInstance } from "../mechanics/MechanicInstance";
import type { EngineContext } from "../types/engineContext";
import { Behavior } from "./Behavior";

/** Accumulates matching dealt damage as a generic future roll bonus. */
export class AbsorveDamageBonusBehavior extends Behavior {
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
        Debugger.display('ENTRA', 'ENTROU AQUI?')
        const operation = data?.operation;
        if (!operation || typeof operation !== "object") return;
        const damage = operation as {
            amount?: unknown;
            sourceTokenId?: unknown;
            targetTokenId: unknown;
            cause?: unknown;
            metadata?: Readonly<Record<string, unknown>>;
        };
        Debugger.display('OPERAÇÃO', 'É VÁLIDA?')
        const requiredAttackType = mechanic.metadata.requiredAttackType;
        if (
            damage.targetTokenId !== mechanic.sourceTokenId ||
            typeof damage.amount !== "number" ||
            damage.amount <= 0 ||
            damage.cause === "REPEATED_DAMAGE" ||
            (typeof requiredAttackType === "string" &&
                damage.metadata?.attackType !== requiredAttackType)
        ) return;
        Debugger.display('PASSOU', 'PASSA DISSO')
        const amount = damage.amount;

        await this.battleSetter.updateMechanicInstance(
            context.battleId,
            mechanic.id,
            (current) => {
                const currentValue = current.metadata.accumulatedStrengthBonus;
                return {
                    ...current,
                    metadata: {
                        ...current.metadata,
                        accumulatedStrengthBonus: (typeof currentValue === "number" ? currentValue : 0) + amount,
                    },
                };
            },
        );
    }
}
