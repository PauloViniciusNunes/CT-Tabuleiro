import { RollData } from "../../operators/RollOperator";
import { MechanicInstance } from "../mechanics/MechanicInstance";
import { Interceptor } from "./Interceptor";
import { InterceptorType } from "./InterceptorType";
import { ItemRepository } from "@/modules/items/repositories/ItemRepository";

export class ApplySpecialOcasionalAdditionInterceptor extends Interceptor<RollData> {

    type: InterceptorType = InterceptorType.ROLL;

    async intercept(data: Readonly<RollData>, mechanic: Readonly<MechanicInstance>): Promise<RollData> {

        if (typeof mechanic.metadata.targetId !== "string") return { ...data }

        if (typeof mechanic.metadata.ocasionalAddition !== "number") return { ...data }

        if (data.params.tokenId !== mechanic.sourceTokenId) return { ...data }

        if (mechanic.metadata.itemCause === undefined) {
            return {
                ...data,
                params: {
                    ...data?.params, // Mantém os outros atributos que já existiam em params
                    O: data.params.O + mechanic.metadata.ocasionalAddition         // Substitui ou adiciona apenas o Q
                }
            };
        }

        if(typeof data.params.usedItemId === "string" && typeof mechanic.metadata.itemName === "string") {
            
            const item = await new ItemRepository().findFirstByName(mechanic.metadata.itemName)

            if(!item) throw new Error("O ID do item que estava garantido está errado em ApplySpecialOcasionalAdditionInterceptor.");

            if(data.params.usedItemId === item.id) {
                return {
                    ...data,
                    params: {
                        ...data?.params, // Mantém os outros atributos que já existiam em params
                        O: data.params.O + mechanic.metadata.ocasionalAddition         // Substitui ou adiciona apenas o Q
                    }
                };                
            } else {
                return {...data}                
            }

        }

        return {
            ...data,
            params: {
                ...data?.params, // Mantém os outros atributos que já existiam em params
                O: data.params.O + mechanic.metadata.ocasionalAddition         // Substitui ou adiciona apenas o Q
            }
        };

    }

}