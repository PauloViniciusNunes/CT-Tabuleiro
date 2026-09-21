import type { DamageData } from "../../operators/DamageOperator";
import type { MechanicInstance } from "../mechanics/MechanicInstance";
import { Interceptor } from "./Interceptor";
import { InterceptorType } from "./InterceptorType";

function protectsTarget(mechanic: MechanicInstance, targetTokenId: string): boolean {
    const configuredTargetId = mechanic.metadata.targetId;
    const protectedTokenId =
        typeof configuredTargetId === "string"
            ? configuredTargetId
            : mechanic.sourceTokenId;

    return protectedTokenId === targetTokenId;
}

export class HalfDamageInterceptor extends Interceptor<DamageData> {
    readonly type = InterceptorType.DAMAGE;

    intercept(
        data: Readonly<DamageData>,
        mechanic: Readonly<MechanicInstance>,
    ): DamageData {
        if (!protectsTarget(mechanic, data.targetTokenId)) {
            return { ...data };
        }

        return {
            ...data,
            amount: Math.floor(data.amount / 2),
        };
    }
}
