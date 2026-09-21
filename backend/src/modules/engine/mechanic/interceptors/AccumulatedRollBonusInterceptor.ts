import type { RollData } from "../../operators/RollOperator";
import type { MechanicInstance } from "../mechanics/MechanicInstance";
import { Interceptor } from "./Interceptor";
import { InterceptorType } from "./InterceptorType";

/** Adds a MechanicInstance metadata value to its owner's occasional roll bonus. */
export class AccumulatedRollBonusInterceptor extends Interceptor<RollData> {
    readonly type = InterceptorType.ROLL;

    intercept(data: Readonly<RollData>, mechanic: Readonly<MechanicInstance>): RollData {
        if (data.params.tokenId !== mechanic.sourceTokenId) return { ...data };

        const metadataKey = typeof mechanic.metadata.rollBonusMetadataKey === "string"
            ? mechanic.metadata.rollBonusMetadataKey
            : "accumulatedRollBonus";
        const modifierKey = typeof mechanic.metadata.rollBonusModifierKey === "string"
            ? mechanic.metadata.rollBonusModifierKey
            : mechanic.id;
        if (data.appliedRollBonusKeys?.includes(modifierKey)) return { ...data };

        const bonus = mechanic.metadata[metadataKey];
        if (typeof bonus !== "number" || bonus === 0) return { ...data };

        return {
            ...data,
            params: { ...data.params, O: data.params.O + bonus },
            appliedRollBonusKeys: [...(data.appliedRollBonusKeys ?? []), modifierKey],
        };
    }
}
