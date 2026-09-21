import { MechanicEvent } from "../events/MechanicEvent";
import { MechanicEventType } from "../MechanicEventType";
import { MechanicInstance } from "../mechanics/MechanicInstance";
import { EngineContext } from "../types/engineContext";
import { Behavior } from "./Behavior";
import { BattleSetter } from "../../context/BattleSetter";
import { TokenTemplateRepository } from "@/modules/asset-library/tokens/repositories/TokenTemplateRepository";
import { BattleGetter } from "../../context/BattleGetter";
import { SpecialResponseHandlerRegistry } from "../../special-response/SpecialResponseHandlerRegistry";
import type {
    SpecialResponseHandlerContext,
    SpecialResponseField,
} from "../../special-response/types";
import { BattleStateRepository } from "@/modules/battles/repositories/BattleStateRepository";
import { MechanicAppliedEvent } from "../events/MechanicAppliedEvent";

const GRANT_MAGIC_HEAPON_HANDLER_KEY = "grant.magic.weapon-handler.key";

function ensureNumberActionHandlerRegistered() {
    if (SpecialResponseHandlerRegistry.has(GRANT_MAGIC_HEAPON_HANDLER_KEY)) {
        return;
    }
    SpecialResponseHandlerRegistry.register(
        GRANT_MAGIC_HEAPON_HANDLER_KEY,
        confirmHandler,
    );    
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

    const token = await new TokenTemplateRepository().findTokenTemplateById(handlerContext.pending.requestedByTokenId)

    if(!token) {
        throw new Error("Não foi possível encontrar token para gerar arma")
    }

    const configuredDefault = handlerContext.pending.context.defaultSpentAction;
    const actions = handlerContext.resolution.values.spentAction ?? configuredDefault;

    if (
        typeof actions !== "number" ||
        !Number.isInteger(actions) ||
        actions < 0
    ) {
        throw new Error("Tipo esperado para GrantMagicWeapon não foi number.")
    }

    const level = token.level

    if(typeof handlerContext.pending.context.mechanicInstanceId !== "string") {
        throw new Error("ID da instância da mecânica exigido para esse método.")
    }

    const weaponOcasionalAddition = (level - 2) * 3 * (actions + 1) ;

    const battleSetter = new BattleSetter()

    const currentActions = await new BattleGetter().getTokenAction(
        handlerContext.pending.battleId,
        token.id,
    );
    if (typeof currentActions !== "number" || actions > currentActions) {
        throw new Error("O token não possui mais ações suficientes para criar a arma.");
    }

    const inventoryMutation = await battleSetter.addItemToTokenInventory(
        handlerContext.pending.battleId, 
        handlerContext.pending.requestedByTokenId,
        "Magic Weapon"
    );
    if (!inventoryMutation.changed) {
        throw new Error("Não há espaço na mochila para criar a arma mágica.");
    }

    if (actions > 0) {
        await battleSetter.tokenDecreaseAction(
            handlerContext.pending.battleId,
            token.id,
            actions,
        );
    }

    await battleSetter.updateMechanicInstance(
        handlerContext.pending.battleId,
        handlerContext.pending.context.mechanicInstanceId,
        (current) => {
            return {
                ...current,
                metadata: {
                    ...current.metadata,
                    ocasionalAddition: weaponOcasionalAddition,
                    alreadyExecute: true,
                    sourceItemId: inventoryMutation.item.id,
                },
            };
        },
    );
}

export class GrantMagicWeaponBehavior extends Behavior {
    constructor(private readonly battleGetter = new BattleGetter()) {
        super();
    }
    
    lister(): MechanicEventType[] {
        return [
            MechanicEventType.MECHANIC_APPLIED
        ]
    }

    async execute(context: EngineContext, mechanic: MechanicInstance, event: MechanicEvent): Promise<void> {
        if (!(event instanceof MechanicAppliedEvent)) return;
        if (event.application.instance?.id !== mechanic.id) return;
        if (mechanic.name !== "magic-weapon") return;
        if (mechanic.metadata.alreadyExecute === true) return;

        const rawCurrentActions = await this.battleGetter.getTokenAction(
            context.battleId,
            mechanic.sourceTokenId,
        );
        const currentActions = typeof rawCurrentActions === "number"
            ? Math.max(0, Math.floor(rawCurrentActions))
            : 0;
        const fields: SpecialResponseField[] = currentActions > 0
            ? [{
                id: "spentAction",
                label: "Total de ações",
                type: "number",
                min: 1,
                max: currentActions,
                step: 1,
                integer: true,
                defaultValue: 1,
            }]
            : [];

        ensureNumberActionHandlerRegistered();
        await context.specialResponses.request({
            responderTokenId: mechanic.sourceTokenId,
            requestedByTokenId: mechanic.sourceTokenId,
            title: "Criar arma mágica",
            description: currentActions > 0
                ? "Escolha quantas ações usar para criar a arma mágica. Quanto mais ações, mais forte a arma."
                : "Não restaram ações após usar o card. Confirme para criar a arma mágica sem bônus adicional.",
            fields,
            handlerKey: GRANT_MAGIC_HEAPON_HANDLER_KEY,
            context: {
                sourceTokenId: mechanic.sourceTokenId,
                targetTokenId: mechanic.sourceTokenId,
                mechanicInstanceId: mechanic.id,
                defaultSpentAction: 0,
            },
        });        

    }
}
