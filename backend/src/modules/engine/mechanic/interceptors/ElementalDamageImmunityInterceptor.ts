import type { DamageData } from "../../operators/DamageOperator";
import { normalizeElement } from "../../utils/elementalAffinity";
import type { MechanicInstance } from "../mechanics/MechanicInstance";
import { Interceptor } from "./Interceptor";
import { InterceptorType } from "./InterceptorType";
import {
    metadataElementList,
    ownerMeetsArsenalRequirement,
} from "./elementalInterceptorMetadata";

/** Cancels configured elemental damage against the mechanic owner. */
export class ElementalDamageImmunityInterceptor extends Interceptor<DamageData> {
    readonly type = InterceptorType.DAMAGE;

    intercept(
        data: Readonly<DamageData>,
        mechanic: Readonly<MechanicInstance>,
    ): DamageData {
        const damageElement = typeof data.element === "string"
            ? normalizeElement(data.element)
            : undefined;

        if (
            !damageElement ||
            data.targetTokenId !== mechanic.sourceTokenId ||
            !ownerMeetsArsenalRequirement(data.targetToken, mechanic)
        ) {
            return { ...data };
        }

        const immuneElements = metadataElementList(mechanic, "immuneDamageElements");
        const ignoredElements = (data.ignoredImmunityElements ?? []).map(normalizeElement);

        if (!immuneElements.includes(damageElement) || ignoredElements.includes(damageElement)) {
            return { ...data };
        }

        return {
            ...data,
            cancelled: true,
        };
    }
}
