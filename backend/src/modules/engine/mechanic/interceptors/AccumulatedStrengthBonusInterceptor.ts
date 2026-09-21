import type { RollData } from "../../operators/RollOperator";
import type { MechanicInstance } from "../mechanics/MechanicInstance";
import { Interceptor } from "./Interceptor";
import { InterceptorType } from "./InterceptorType";
import { getAccumulatedStrengthBonus } from "../constants/accumulatedStrengthBonus";

export class AccumulatedStrengthBonusInterceptor extends Interceptor<RollData> {
    readonly type = InterceptorType.ROLL;

    intercept(
        data: Readonly<RollData>,
        mechanic: Readonly<MechanicInstance>,
    ): RollData {
        const isMechanicOwner =
            data.params.tokenId === mechanic.sourceTokenId;
        const sourceItemId = mechanic.metadata.sourceItemId;

        // The mechanic belongs to an equipped item, but the bonus must only
        // affect a roll that explicitly selected that same item.
        if (
            !isMechanicOwner ||
            data.params.attribute !== "forca" ||
            typeof sourceItemId !== "string" ||
            data.usedItemId !== sourceItemId
        ) {
            return { ...data };
        }

        const accumulatedStrengthBonus = getAccumulatedStrengthBonus(
            mechanic.metadata,
        );

        return {
            ...data,
            params: {
                ...data.params,
                O: data.params.O + accumulatedStrengthBonus,
            },
        };
    }
}
