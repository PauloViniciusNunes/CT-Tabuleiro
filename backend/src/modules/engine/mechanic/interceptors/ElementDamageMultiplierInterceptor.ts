import type { DamageData } from "../../operators/DamageOperator";
import { normalizeElement } from "../../utils/elementalAffinity";
import type { MechanicInstance } from "../mechanics/MechanicInstance";
import { Interceptor } from "./Interceptor";
import { InterceptorType } from "./InterceptorType";
import {
    metadataMultiplier,
    metadataString,
} from "./elementalInterceptorMetadata";

function elementsFrom(value: unknown): string[] {
    const values = Array.isArray(value)
        ? value
        : typeof value === "string"
            ? [value]
            : [];

    return [...new Set(
        values
            .filter((entry): entry is string =>
                typeof entry === "string" && entry.trim().length > 0,
            )
            .map(normalizeElement),
    )];
}

/**
 * Resolves the elements carried by a damage operation. Direct attacks use
 * element; card damage additionally transports its effect tags through
 * metadata.damageElements.
 */
function mechanicOwnerId(mechanic: Readonly<MechanicInstance>): string {
    const targetId = mechanic.metadata.targetId;
    return typeof targetId === "string" && targetId
        ? targetId
        : mechanic.sourceTokenId;
}

function damageElements(data: Readonly<DamageData>): string[] {
    return [...new Set([
        ...elementsFrom(data.element),
        ...elementsFrom(data.metadata?.damageElements),
    ])];
}

/**
 * Generic damage amplifier owned by the affected token. Definitions configure:
 * requiredDamageElement, damageMultiplier, damageRounding and damageModifierKey.
 */
export class ElementDamageMultiplierInterceptor extends Interceptor<DamageData> {
    readonly type = InterceptorType.DAMAGE;

    intercept(
        data: Readonly<DamageData>,
        mechanic: Readonly<MechanicInstance>,
    ): DamageData {
        const requiredElement = metadataString(mechanic, "requiredDamageElement");
        if (
            !requiredElement ||
            data.sourceTokenId !== mechanicOwnerId(mechanic) ||
            !damageElements(data).includes(normalizeElement(requiredElement))
        ) {
            return { ...data };
        }

        const modifierKey = metadataString(mechanic, "damageModifierKey") ??
            "element-damage-multiplier:" + mechanic.id;
        const appliedModifierKeys = [...(data.appliedDamageModifierKeys ?? [])];
        if (appliedModifierKeys.includes(modifierKey)) {
            return { ...data };
        }

        const multiplier = metadataMultiplier(mechanic, "damageMultiplier", 1);
        const rounding = metadataString(mechanic, "damageRounding");
        const amount = rounding === "ceil"
            ? Math.ceil(data.amount * multiplier)
            : Math.floor(data.amount * multiplier);

        return {
            ...data,
            amount,
            appliedDamageModifierKeys: [...appliedModifierKeys, modifierKey],
        };
    }
}
