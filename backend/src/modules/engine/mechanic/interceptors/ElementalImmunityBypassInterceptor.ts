import type { DamageData } from "../../operators/DamageOperator";
import { normalizeElement } from "../../utils/elementalAffinity";
import type { MechanicInstance } from "../mechanics/MechanicInstance";
import { Interceptor } from "./Interceptor";
import { InterceptorType } from "./InterceptorType";
import {
    metadataElementList,
    ownerMeetsArsenalRequirement,
} from "./elementalInterceptorMetadata";

/** Marks configured damage elements as able to bypass matching elemental immunity. */
export class ElementalImmunityBypassInterceptor extends Interceptor<DamageData> {
    readonly type = InterceptorType.DAMAGE;
    override readonly priority = -100;

    intercept(
        data: Readonly<DamageData>,
        mechanic: Readonly<MechanicInstance>,
    ): DamageData {
        const damageElement = typeof data.element === "string"
            ? normalizeElement(data.element)
            : undefined;

        if (
            !damageElement ||
            data.sourceTokenId !== mechanic.sourceTokenId ||
            !ownerMeetsArsenalRequirement(data.sourceToken, mechanic) ||
            !metadataElementList(mechanic, "bypassImmunityElements").includes(damageElement)
        ) {
            return { ...data };
        }

        return {
            ...data,
            ignoredImmunityElements: [...new Set([
                ...(data.ignoredImmunityElements ?? []).map(normalizeElement),
                damageElement,
            ])],
        };
    }
}
