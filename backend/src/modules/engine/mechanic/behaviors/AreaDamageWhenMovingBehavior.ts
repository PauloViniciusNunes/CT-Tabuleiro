import { Position } from "../../context/dao/pendingDaos";
import { calculateDistance } from "../../utils/calculations";
import { profileHasElement } from "../../utils/elementalAffinity";
import { MechanicEventType } from "../MechanicEventType";
import type { MechanicEvent } from "../events/MechanicEvent";
import { TokenMovedEvent } from "../events/TokenMovedEvent";
import { TokenTemplateRepository } from "@/modules/asset-library/tokens/repositories/TokenTemplateRepository";
import type { MechanicInstance } from "../mechanics/MechanicInstance";
import type { EngineContext } from "../types/engineContext";
import { Behavior } from "./Behavior";
import { Debugger } from "../../utils/Debug";


function tokensIdsInRange(position: Position, boardTokens: any[], range: number): string[] {

    const filtered = boardTokens.filter((t) => calculateDistance(t, position) <= range)
    const filteredIds = filtered.map((t) => t.id)

    return filteredIds
}

export class AreaDamageWhenMovingBehavior extends Behavior {
    lister(): MechanicEventType[] {
        return [MechanicEventType.TOKEN_MOVED];
    }

    async execute(
        context: EngineContext,
        mechanic: MechanicInstance,
        _event: MechanicEvent,
        data?: Record<string, unknown>,
    ): Promise<void> {

        Debugger.display("CHEGOU", 'Ele chegou até aqui?')
        if (!(_event instanceof TokenMovedEvent)) return

        const movedTokenId = _event.movement.tokenId

        if (movedTokenId !== mechanic.sourceTokenId) return
        if (typeof mechanic.metadata.distanceToDamage !== "number") return
        
        const idsInRange = tokensIdsInRange(
            { col: _event.movement.to.col, row: _event.movement.to.row },
            context.boardTokens,
            mechanic.metadata.distanceToDamage
        )

        const sourceToken = await new TokenTemplateRepository().findTokenTemplateById(mechanic.sourceTokenId)

        if(!sourceToken) throw new Error("Não foi possível achar sourceToken para AreaDamageWhenMovingBehavior.");



        const filteredIds = idsInRange.filter((id) => id !== mechanic.sourceTokenId)

        if(typeof mechanic.metadata.damageToLevelMultiplier !== "number") throw new Error("damageToLevelMultiplier não era o tipo esperado para AreaDamageWhenMovingBehavior.")

        const damage = sourceToken.level * mechanic.metadata.damageToLevelMultiplier;

        if(typeof damage !== "number") throw new Error("Damage não era o tipo esperado para AreaDamageWhenMovingBehavior.")

        for(const id of filteredIds) {
            await context.operations.damage({
                sourceTokenId: mechanic.sourceTokenId,
                targetTokenId: id,
                amount: damage
            })
        }

    }
}
