import { MechanicEventType } from "../MechanicEventType";
import { MechanicInstance } from "../mechanics/MechanicInstance";
import { EngineContext } from "../types/engineContext";
import { Behavior } from "./Behavior";

import { BattleStateRepository } from "@/modules/battles/repositories/BattleStateRepository";
import { TokenTemplateRepository } from "@/modules/asset-library/tokens/repositories/TokenTemplateRepository";

export class DamageInitTurnBehavior extends Behavior {

    private readonly battleStateRepository = new BattleStateRepository()
    private readonly tokenInstanceRepository = new TokenTemplateRepository()

    lister(): MechanicEventType[] {
        return [
            MechanicEventType.TURN_INIT
        ]
    }

    async execute(context: EngineContext, mechanic: MechanicInstance): Promise<void> {
        const battleState = await this.battleStateRepository.findById(context.battleId)

        if(!battleState) {
            throw new Error("Ocorreu um problema ao tentar encontrar uma batalha.")
        }

        const targetId = (mechanic.metadata["targetId"] as string) ?? ""
        if (!targetId || context.currentTokenId !== targetId) return;

        const tokenTarget = await this.tokenInstanceRepository.findTokenTemplateById(targetId)

        if(!tokenTarget) {
            throw new Error(`Não foi possível encontrar o token com o ID ${targetId}`)
        }

        const configuredPeriodicDamage = mechanic.metadata.periodicDamage;
        const amount = typeof configuredPeriodicDamage === "number" &&
            Number.isFinite(configuredPeriodicDamage) &&
            configuredPeriodicDamage > 0
            ? configuredPeriodicDamage
            : 4 * mechanic.intensity;

        await context.operations.damage({
            sourceTokenId: mechanic.sourceTokenId,
            targetTokenId: targetId,
            amount,
            cause: "TURN_MECHANIC_DAMAGE",
            metadata: {
                mechanicId: mechanic.id,
                attackType: "mechanic",
            },
        })
    }
}
