import { TokenTemplateRepository } from "@/modules/asset-library/tokens/repositories/TokenTemplateRepository";
import { MechanicEventType } from "../MechanicEventType";
import type { MechanicEvent } from "../events/MechanicEvent";
import type { MechanicInstance } from "../mechanics/MechanicInstance";
import type { EngineContext } from "../types/engineContext";
import { Behavior } from "./Behavior";
import { SpecialResponseHandlerContext, SpecialResponseHandlerRegistry } from "../../special-response";
import { BattleStateRepository } from "@/modules/battles/repositories/BattleStateRepository";
import { MechanicEngine } from "../MechanicEngine";
import { OperatorType } from "../../operators/OperatorType";

const SWAP_LM_RESPONSE_HANDLER_KEY = "swap.lm.response-handler.key"

function ensureSwapLifeByManaHandler() {
    if(SpecialResponseHandlerRegistry.has(SWAP_LM_RESPONSE_HANDLER_KEY)) {
        return
    }

    SpecialResponseHandlerRegistry.register(
        SWAP_LM_RESPONSE_HANDLER_KEY,
        confirmHandler
    )
}

async function confirmHandler(handlerContext: SpecialResponseHandlerContext) {
    const [battle] = await Promise.all([
        new BattleStateRepository().findById(handlerContext.pending.battleId),
    ]);

    if (!battle || battle.status !== "In Battle") {
        throw new Error("A batalha terminou antes da criação da arma mágica.");
    }

    if (handlerContext.resolution.action === "cancel") {
        return;
    }

    if(!handlerContext.pending.requestedByTokenId) return

    const tokenSource = await new TokenTemplateRepository().findTokenTemplateById(handlerContext.pending.requestedByTokenId)

    if(!tokenSource) {
        console.error("Não foi possível achar tokenSource para SelfMaxLifeDamageOnFailedTestBehavior.")
        return
    }

    const lifeGiven = handlerContext.resolution.values.spentLife

    if(typeof lifeGiven !== "number") throw new Error("lifeGiven chegou com um valor inapropiado.")

    if (lifeGiven >= tokenSource.currentLife) {
        throw new Error("A conversão precisa preservar ao menos 1 ponto de vida.")
    }

    const lifeDecrease = await MechanicEngine.operators.execute(
        OperatorType.LIFE_DECREASE,
        {
            battleId: battle.id,
            sourceTokenId: tokenSource.id,
            targetTokenId: tokenSource.id,
            amount: lifeGiven,
            cause: "LIFE_TO_MANA_CONVERSION",
        },
    )
    if (lifeDecrease.cancelled) return

    const manaIncrement = Math.ceil((lifeDecrease.amount + tokenSource.level * 2) / 10)
    await MechanicEngine.operators.execute(OperatorType.MANA_INCREMENT, {
        battleId: battle.id,
        sourceTokenId: tokenSource.id,
        amount: manaIncrement,
        cause: "LIFE_TO_MANA_CONVERSION",
        parentOperationId: lifeDecrease.operationId,
    })

}

/** Deals the affected target its own maximum life after a configured failed test. */
export class SelfMaxLifeDamageOnFailedTestBehavior extends Behavior {
    constructor(private readonly tokenRepository = new TokenTemplateRepository()) {
        super();
    }

    lister(): MechanicEventType[] {
        return [
            MechanicEventType.MECHANIC_APPLIED,
        ];
    }

    async execute(
        context: EngineContext,
        mechanic: MechanicInstance,
        event: MechanicEvent,
        data?: Record<string, unknown>,
    ): Promise<void> {

        if(mechanic.sourceTokenId) throw new Error("Token ID não foi passado corretamente para SelfMaxLifeDamageOnFailedTestBehavior.");
        if(typeof mechanic.metadata.targetId !== "string") throw new Error("É necessário um campo de targetId para SelfMaxLifeDamageOnFailedTestBehavior.")

        const token = await this.tokenRepository.findTokenTemplateById(mechanic.sourceTokenId);
        const target = await this.tokenRepository.findTokenTemplateById(mechanic.metadata.targetId);

        if(!token || !target) throw new Error("Os tokens essenciais não foram encontrados.");

        const currentLife = target.currentLife;

        if(currentLife < 0) {
            return
        }

        if(Math.ceil(currentLife) - 1 < 0) {
            return
        }

        ensureSwapLifeByManaHandler()
        await context.specialResponses.request({
            responderTokenId: mechanic.sourceTokenId,
            requestedByTokenId: mechanic.sourceTokenId,
            title: "Bombear",
            description:
                "Selecione a quantidade do HP que deseja doar para converter em mana. O máximo que pode doar é: ${}",
            fields: [{
                id: "spentLife",
                label: "Pontos de Vida",
                type: "number",
                min: 1,
                max: Math.ceil(currentLife) - 1,
                step: 1,
                integer: true,
                defaultValue: 1,
            }],
            handlerKey: SWAP_LM_RESPONSE_HANDLER_KEY,
            context: {
                sourceTokenId: mechanic.sourceTokenId,
                targetTokenId: mechanic.sourceTokenId,
                mechanicInstanceId: mechanic.id,

            },
        });        
    }


}
