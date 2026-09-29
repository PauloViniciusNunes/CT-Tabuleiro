import { BattleSetter } from "../../context/BattleSetter";
import type { DamageData } from "../../operators/DamageOperator";
import type { MechanicInstance } from "../mechanics/MechanicInstance";
import { Interceptor } from "./Interceptor";
import { InterceptorType } from "./InterceptorType";

function affectedTokenId(mechanic: Readonly<MechanicInstance>): string {
    const targetId = mechanic.metadata.targetId;
    return typeof targetId === "string" && targetId
        ? targetId
        : mechanic.sourceTokenId;
}

/** Absorbs incoming damage with a numeric resource stored on mechanic metadata. */
export class VirtualDamageResourceInterceptor extends Interceptor<DamageData> {
    readonly type = InterceptorType.DAMAGE;
    override readonly priority = 100;

    constructor(private readonly battleSetter = new BattleSetter()) {
        super();
    }

    async intercept(
        data: Readonly<DamageData>,
        mechanic: Readonly<MechanicInstance>,
    ): Promise<DamageData> {

        if (
            data.targetTokenId !== affectedTokenId(mechanic) ||
            data.amount <= 0
        ) return { ...data };

        const currentKey = mechanic.metadata.virtualResourceCurrentMetadataKey;
        if (typeof currentKey !== "string" || !currentKey) return { ...data };

        const modifierKey = `virtual-damage-resource:${mechanic.id}:${data.operationId}`;
        if (data.appliedDamageModifierKeys?.includes(modifierKey)) {
            return { ...data };
        }

        const resource = await this.battleSetter.consumeMechanicMetadataResource(
            data.battleId,
            mechanic.id,
            currentKey,
            data.amount,
        );
        
        if (!resource.mechanicFound || !resource.resourceFound) return { ...data };

        const absorbed = resource.consumed;
        const remainingResource = resource.remaining;

        return {
            ...data,
            amount: Math.max(0, data.amount - absorbed),
            appliedDamageModifierKeys: [
                ...(data.appliedDamageModifierKeys ?? []),
                modifierKey,
            ],
            absorbedDamageByMechanic: {
                ...(data.absorbedDamageByMechanic ?? {}),
                [mechanic.id]: absorbed,
            },
            depletedMechanicIds: remainingResource <= 0
                ? [...new Set([...(data.depletedMechanicIds ?? []), mechanic.id])]
                : data.depletedMechanicIds,
        };
    }
}
