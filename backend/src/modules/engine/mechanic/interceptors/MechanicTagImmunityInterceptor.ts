import type { MechanicApplicationData } from "../../operators/MechanicApplicationOperator";
import { normalizeElement } from "../../utils/elementalAffinity";
import type { MechanicInstance } from "../mechanics/MechanicInstance";
import { Interceptor } from "./Interceptor";
import { InterceptorType } from "./InterceptorType";
import {
    metadataElementList,
    ownerMeetsArsenalRequirement,
} from "./elementalInterceptorMetadata";

/** Prevents configured mechanic tags from being applied to the mechanic owner. */
export class MechanicTagImmunityInterceptor extends Interceptor<MechanicApplicationData> {
    readonly type = InterceptorType.MECHANIC_APPLICATION;

    intercept(
        data: Readonly<MechanicApplicationData>,
        mechanic: Readonly<MechanicInstance>,
    ): MechanicApplicationData {
        if (
            data.targetTokenId !== mechanic.sourceTokenId ||
            !ownerMeetsArsenalRequirement(data.targetToken, mechanic)
        ) {
            return { ...data };
        }

        const immuneTags = metadataElementList(mechanic, "immuneMechanicTags");
        if (!immuneTags.includes(normalizeElement(data.tag))) {
            return { ...data };
        }

        return {
            ...data,
            cancelled: true,
        };
    }
}
