import type { DamageData } from "../../operators/DamageOperator";
import {
    normalizeElement,
    profileHasDisadvantage,
    profileHasElement,
} from "../../utils/elementalAffinity";
import type { MechanicInstance } from "../mechanics/MechanicInstance";
import { Interceptor } from "./Interceptor";
import { InterceptorType } from "./InterceptorType";
import {
    metadataMultiplier,
    metadataString,
    ownerMeetsArsenalRequirement,
} from "./elementalInterceptorMetadata";

/** Applies a configurable multiplier according to the target's elemental affinity. */
export class ElementalAffinityDamageMultiplierInterceptor extends Interceptor<DamageData> {
    readonly type = InterceptorType.DAMAGE;

    intercept(
        data: Readonly<DamageData>,
        mechanic: Readonly<MechanicInstance>,
    ): DamageData {
        const configuredElement = metadataString(mechanic, "damageElement");
        const damageElement = typeof data.element === "string"
            ? normalizeElement(data.element)
            : undefined;

        if (
            data.sourceTokenId !== mechanic.sourceTokenId ||
            !configuredElement ||
            damageElement !== normalizeElement(configuredElement) ||
            !ownerMeetsArsenalRequirement(data.sourceToken, mechanic)
        ) {
            return { ...data };
        }

        const modifierKey = metadataString(mechanic, "damageModifierKey");
        const appliedKeys = [...(data.appliedDamageModifierKeys ?? [])];
        const alreadyApplied = modifierKey ? appliedKeys.includes(modifierKey) : false;

        if (alreadyApplied) {
            return { ...data };
        }

        // Advantage wins over disadvantage when malformed data contains both.
        const hasAdvantage = profileHasElement(data.targetToken, damageElement);
        const hasDisadvantage = profileHasDisadvantage(data.targetToken, damageElement);
        const multiplier = hasAdvantage
            ? metadataMultiplier(mechanic, "advantagedDamageMultiplier", 1)
            : hasDisadvantage
                ? metadataMultiplier(mechanic, "disadvantagedDamageMultiplier", 1)
                : metadataMultiplier(mechanic, "neutralDamageMultiplier", 1);

        if (modifierKey) {
            appliedKeys.push(modifierKey);
        }

        return {
            ...data,
            amount: Math.floor(data.amount * multiplier),
            appliedDamageModifierKeys: appliedKeys,
        };
    }
}
