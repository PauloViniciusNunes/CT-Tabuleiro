import { RollData } from "../../operators/RollOperator";
import { MechanicInstance } from "../mechanics/MechanicInstance";
import { haveSomeMechanic } from "../utils/haveSomeMechanic";
import { Interceptor } from "./Interceptor";
import { InterceptorType } from "./InterceptorType";


export class DarkenedDisvantageRollInterceptor extends Interceptor<RollData> {

    type: InterceptorType = InterceptorType.ROLL;

    async intercept(data: Readonly<RollData>, mechanic: Readonly<MechanicInstance>): Promise<RollData> {

        if (typeof mechanic.metadata.targetId !== "string") return { ...data }

        if (data.params.tokenId === mechanic.sourceTokenId) return {...data}

        if (data.params.tokenId !== mechanic.metadata.targetId) return { ...data }

        // SE TEM VISÃO NOTURNA, IGNORE
        const darkenedIgnoreMechanics: string[] = [
            "fire",
            "dark-fire",
            "night-vision"
        ]

        const tokenHaveSomeMechanic = await haveSomeMechanic(data.battleId, data.params.tokenId, darkenedIgnoreMechanics)

        if(tokenHaveSomeMechanic) return {...data}

        return {
            ...data,
            params: {
                ...data?.params, // Mantém os outros atributos que já existiam em params
                P: Math.round(data.params.P * 0.5)      
            }
        };

    }

}