import { MechanicEvent } from "../events/MechanicEvent";
import { MechanicEventType } from "../MechanicEventType";
import { MechanicInstance } from "../mechanics/MechanicInstance";
import { EngineContext } from "../types/engineContext";
import { Behavior } from "./Behavior";

import { BattleSetter } from "../../context/BattleSetter";
import { getAccumulatedStrengthBonus } from "../constants/accumulatedStrengthBonus";

export class AccumulatedStrengthBonusBehavior extends Behavior {

    private readonly battleSetter = new BattleSetter();

    lister(): MechanicEventType[] {
        return [
            MechanicEventType.DAMAGE_RECEIVED
        ];
    }

    async execute(
        context: EngineContext,
        mechanic: MechanicInstance,
        event: MechanicEvent,
        data?: Record<string, unknown>
    ): Promise<void> {

        if (
            !data ||
            typeof data["damage"] !== "number" ||
            !Number.isFinite(data["damage"])
        ) {
            return;
        }

        const damage = data["damage"];

        // DamageOperator emits the final post-interception value. Zero damage
        // is not a hit for IMACULADA and must never advance its bonus.
        if (damage <= 0) {
            return;
        }

        /*
         * Muito importante:
         * só acumula se o dano tiver sido causado pelo
         * portador desta Mechanic.
         */
        const sourceTokenId = data["sourceTokenId"];

        if (
            typeof sourceTokenId !== "string" ||
            sourceTokenId !== mechanic.sourceTokenId
        ) {
            return;
        }

        await this.battleSetter.updateMechanicInstance(
            context.battleId,
            mechanic.id,
            (currentMechanic) => {
                const currentBonus = getAccumulatedStrengthBonus(
                    currentMechanic.metadata,
                );

                return {
                    ...currentMechanic,
                    metadata: {
                        ...currentMechanic.metadata,
                        accumulatedStrengthBonus: currentBonus + damage,
                    },
                };
            },
        );
    }
}
