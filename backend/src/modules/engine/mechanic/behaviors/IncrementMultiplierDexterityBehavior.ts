import { MechanicEventType } from "../MechanicEventType";
import { MechanicInstance } from "../mechanics/MechanicInstance";
import { EngineContext } from "../types/engineContext";
import { Behavior } from "./Behavior";

import { BattleStateRepository } from "@/modules/battles/repositories/BattleStateRepository";
import { TokenTemplateRepository } from "@/modules/asset-library/tokens/repositories/TokenTemplateRepository";
import { BattleSetter } from "../../context/BattleSetter";

export class IncrementMultiplierDexterityBehavior extends Behavior {

    private readonly battleStateRepository = new BattleStateRepository()
    private readonly tokenInstanceRepository = new TokenTemplateRepository()
    private readonly battleSetter = new BattleSetter()

    lister(): MechanicEventType[] {
        return [
            MechanicEventType.MECHANIC_APPLIED
        ]
    }

    async execute(context: EngineContext, mechanic: MechanicInstance): Promise<void> {
        // Aplicar o incremento no bônus de destreza
        const battleState = await this.battleStateRepository.findById(context.battleId)

        if(!battleState) {
            throw new Error("Ocorreu um problema ao tentar encontrar uma batalha.")
        }

        if(typeof mechanic.metadata.incrementMultiplier !== "number") return
        if(typeof mechanic.metadata.accumulatedDexterityBonus !== "number") return 
        if(mechanic.metadata.accumulatedDexterityBonus !== 0) return;

        const tokenTarget = await this.tokenInstanceRepository.findTokenTemplateById(mechanic.sourceTokenId);

        if(!tokenTarget) throw new Error("Não foi possível encontrar Token Target para IncrementMultiplierDexterityBehavior.");

        const newBonus = tokenTarget.level * mechanic.metadata.incrementMultiplier

        await this.battleSetter.updateMechanicInstance(
            context.battleId,
            mechanic.id,
            (current) => ({
                ...current,
                metadata: { ...current.metadata, accumulatedDexterityBonus: newBonus },
            }),
        );        
    }
}
