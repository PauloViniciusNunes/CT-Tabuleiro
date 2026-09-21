import { BattleGetter } from "../../context/BattleGetter";
import { BattleSetter } from "../../context/BattleSetter";
import { Debugger } from "../../utils/Debug";
import { MechanicEventType } from "../MechanicEventType";
import type { MechanicEvent } from "../events/MechanicEvent";
import type { MechanicInstance } from "../mechanics/MechanicInstance";
import type { EngineContext } from "../types/engineContext";
import { Behavior } from "./Behavior";
import { SpecialResponseHandlerRegistry } from "../../special-response";
import { CONFIRM_EFFECT_HANDLER_KEY } from "../../special-response/handlers/ConfirmEffectHandler";
import { SpecialResponseHandlerContext } from "../../special-response";
import { BattleStateRepository } from "@/modules/battles/repositories/BattleStateRepository";

import { TokenTemplateRepository } from "@/modules/asset-library/tokens/repositories/TokenTemplateRepository";
import { findMechanic } from "../../special-response/handlers/ProficiencyRollReductionHandler";
import { readStoredAction } from "../../special-response/handlers/ProficiencyRollReductionHandler";
import { resumeAction } from "../../special-response/handlers/ProficiencyRollReductionHandler";
import { OperatorType } from "../../operators/OperatorType";

function ensureConfirmEffectHandler() {
    if (SpecialResponseHandlerRegistry.has(CONFIRM_EFFECT_HANDLER_KEY)) {
        return;
    }
    SpecialResponseHandlerRegistry.register(
        CONFIRM_EFFECT_HANDLER_KEY,
        confirmHandler,
    );
}

async function confirmHandler(handlerContext: SpecialResponseHandlerContext) {

    const [battle] = await Promise.all([
        new BattleStateRepository().findById(handlerContext.pending.battleId),
    ]);

    if (!battle || battle.status !== "In Battle") {
        throw new Error("A batalha terminou antes da resposta de Super Percepção.");
    }

    const mechanicId = handlerContext.pending.context.mechanicInstanceId

    if (typeof mechanicId !== "string") return

    if (handlerContext.resolution.action === "cancel")
        return

    
    const thoseMechanic = findMechanic(battle.activeMechanics, mechanicId)

    if(typeof thoseMechanic?.metadata.penaltyRate !== "number") return

    const newPenaltyRate: number = thoseMechanic.metadata.penaltyRate + 1

    await new BattleSetter().updateMechanicInstance(
        battle.id,
        mechanicId,
        (current) => {

            return {
                ...current,
                metadata: {
                    ...current.metadata,
                    penaltyRate: newPenaltyRate
                },
            };
        },
    );

}

/** Accumulates matching dealt damage as a generic future roll bonus. */
export class IncreasePenaltiesLifeAndAttributes extends Behavior {
    constructor(
        private readonly battleSetter = new BattleSetter(),
        private readonly battleGetter = new BattleGetter()
    ) {
        super();
    }

    lister(): MechanicEventType[] {
        return [MechanicEventType.TURN_INIT];
    }

    async execute(
        context: EngineContext,
        mechanic: MechanicInstance,
        _event: MechanicEvent,
        data?: Record<string, unknown>,
    ): Promise<void> {

        if (!context.battleId) throw new Error("Não foi passado battleId para context.")

        const currentToken = await this.battleGetter.getCurrentBattleToken(context.battleId)
        const currentTokenId = currentToken.id

        if (currentTokenId !== mechanic.sourceTokenId) return

        const targetTokenId =
            typeof mechanic.metadata.targetId === "string"
                ? mechanic.metadata.targetId
                : mechanic.sourceTokenId;

        ensureConfirmEffectHandler()
        await context.specialResponses.request({
            responderTokenId: mechanic.sourceTokenId,
            requestedByTokenId: mechanic.sourceTokenId,
            title: "Drenagem Sanguínea",
            description:
                "Deseja aplicar as condições da Drenagem Sanguínea no alvo?",
            fields: [],
            handlerKey: CONFIRM_EFFECT_HANDLER_KEY,
            context: {
                sourceTokenId: mechanic.sourceTokenId,
                targetTokenId: targetTokenId,
                mechanicInstanceId: mechanic.id,
                metadata: mechanic.metadata ?? {},
            },
        });

    }
}
