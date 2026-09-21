import { RollData } from "../../operators/RollOperator";
import { MechanicInstance } from "../mechanics/MechanicInstance";
import { Interceptor } from "./Interceptor";
import { InterceptorType } from "./InterceptorType";

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value)
    );
}

export class RollPenaltyInterceptor extends Interceptor<RollData> {

    type: InterceptorType = InterceptorType.ROLL;

    intercept(data: Readonly<RollData>, mechanic: Readonly<MechanicInstance>): RollData | Promise<RollData> {

        if (typeof mechanic.metadata.targetId !== "string") return { ...data }

        if (isPlainObject(mechanic.metadata.attributesDecrease)) return { ...data }

        if (Array.isArray(mechanic.metadata.attributesDecrease) &&
            !(mechanic.metadata.attributesDecrease.some((a) => a === data.params.attribute))) return { ...data }

        if (data.params.tokenId !== mechanic.metadata.targetId) return { ...data }

        if(!mechanic.metadata.penaltyRate || typeof mechanic.metadata.penaltyRate !== "number") return {...data}

        return {
            ...data,
            params: {
                ...data?.params, // Mantém os outros atributos que já existiam em params
                A: data.params.A * Math.pow(0.5, mechanic.metadata.penaltyRate)             // Substitui ou adiciona apenas o Q
            }
        };

    }

}