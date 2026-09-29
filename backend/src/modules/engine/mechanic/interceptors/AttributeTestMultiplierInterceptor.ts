import type { RollData } from "../../operators/RollOperator";
import type { MechanicInstance } from "../mechanics/MechanicInstance";
import { Interceptor } from "./Interceptor";
import { InterceptorType } from "./InterceptorType";

function affectedTokenId(mechanic: Readonly<MechanicInstance>): string {
    const targetId = mechanic.metadata.targetId;
    return typeof targetId === "string" && targetId
        ? targetId
        : mechanic.sourceTokenId;
}

/** Multiplies the full benefit subtotal of rolls made with one attribute. */
export class AttributeTestMultiplierInterceptor extends Interceptor<RollData> {
    readonly type = InterceptorType.ROLL;

    constructor(
        private readonly attribute: string,
        private readonly multiplier: number,
    ) {
        super();

        if (!attribute || !Number.isFinite(multiplier) || multiplier < 0) {
            throw new Error("O multiplicador de teste precisa de atributo e valor válidos.");
        }
    }

    intercept(
        data: Readonly<RollData>,
        mechanic: Readonly<MechanicInstance>,
    ): RollData {
        if (
            data.params.tokenId !== affectedTokenId(mechanic) ||
            data.params.attribute !== this.attribute
        ) {
            return { ...data };
        }

        const modifierKey = `attribute-test-multiplier:${mechanic.id}:${data.operationId}`;
        if (data.appliedRollMultiplierKeys?.includes(modifierKey)) {
            return { ...data };
        }

        return {
            ...data,
            params: {
                ...data.params,
                // P multiplies the complete benefit subtotal in calculateActionRoll.
                P: data.params.P * this.multiplier,
            },
            appliedRollMultiplierKeys: [
                ...(data.appliedRollMultiplierKeys ?? []),
                modifierKey,
            ],
        };
    }
}
