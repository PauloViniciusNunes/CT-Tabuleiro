import { MechanicEvent } from "../events/MechanicEvent";
import { MechanicEventType } from "../MechanicEventType";
import { MechanicInstance } from "../mechanics/MechanicInstance";
import { EngineContext } from "../types/engineContext";
import { Behavior } from "./Behavior";
import { BattleSetter } from "../../context/BattleSetter";
import { ManaDecreaseOperator } from "../../operators/ManaDecreaseOperator";
import { TokenTemplateRepository } from "@/modules/asset-library/tokens/repositories/TokenTemplateRepository";
TokenTemplateRepository

export class ElementaryTheftBehavior extends Behavior {
    constructor(private readonly battleSetter = new BattleSetter()) {
        super();
    }
    
    lister(): MechanicEventType[] {
        return [
            MechanicEventType.DAMAGE_RECEIVED
        ]
    }

    async execute(context: EngineContext, mechanic: MechanicInstance, event: MechanicEvent, data?: Record<string, unknown>): Promise<void> {
        if(!data) return

        if(data.sourceTokenId !== mechanic.sourceTokenId) return

        if(data.element !== "neutro" && data.element !== "none") return

        const token = await new TokenTemplateRepository().findTokenTemplateById(mechanic.sourceTokenId)

        if(!token) throw new Error("Não foi possível encontrar token");

        const proficiency = Math.ceil((token.level - 10) / 4 + 4);

        await context.operations.manaIncrement({
            sourceTokenId: mechanic.sourceTokenId,
            amount: proficiency
        })
    }
}