import type { RollData } from "../../operators/RollOperator";
import { Debugger } from "../../utils/Debug";
import type { MechanicInstance } from "../mechanics/MechanicInstance";
import { Interceptor } from "./Interceptor";
import { InterceptorType } from "./InterceptorType";

/** Adds a MechanicInstance metadata value to its owner's occasional roll bonus. */
export class AccumulatedStrenghtRollBonusInterceptor extends Interceptor<RollData> {
    readonly type = InterceptorType.ROLL;

    intercept(data: Readonly<RollData>, mechanic: Readonly<MechanicInstance>): RollData {
        if (data.params.tokenId !== mechanic.sourceTokenId) return { ...data };

        if(!data.params.attribute || data.params.attribute !== "forca") return {...data}

        Debugger.display("ACCUMULATED", mechanic.metadata.accumulatedStrengthBonus)
        if(typeof mechanic.metadata.accumulatedStrengthBonus !== "number") return {...data}

        const bonus = mechanic.metadata.accumulatedStrengthBonus;
        Debugger.display("BONUS", bonus)
        if (typeof bonus !== "number" || bonus === 0) return { ...data };

        return {
            ...data,
            params: { ...data.params, O: data.params.O + bonus },
        };
    }
}
