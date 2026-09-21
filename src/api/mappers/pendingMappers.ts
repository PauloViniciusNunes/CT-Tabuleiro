import type { PendingAttack } from "../../types/battle";
import type { RollResult } from "../../types/battle";
import type { FreeResponse } from "../../types/battle";

export function PendingAttackMapper(json: any): PendingAttack | null {

    if(!json) return null

    return {
        attackerId: json.attackerId,
        targetId: json.targetId,
        rawDamage: json.rawDamage,
        attackRoll: json.attackRoll,
        usedMana: json.usedMana,
        attackAttribute: json.attackAttribute,
        pendingReactions: json.pendingReactions,
        isReactionAllowed: json.isReactionAllowed,
        isFreeAttack: json.isFreeAttack,
        usedActions: json.usedActions,
        atackElement: json.atackElement ?? json.attackElement ?? "neutro",
        usedItem: json.usedItem
    }
}

export function PendingFreeResponseMapper(json: any) : FreeResponse | null {

    if(!json) return null

    return {
        responderId: json.responderId,
        paralyzedId: json.paralyzedId
    }
}

export function PendingEsquivaRollMapper(json: any): RollResult | null{

    if(!json) return null

    return {
        rawRolls: json.rawRolls,
        total: json.total,
        usedMana: json.usedMana,
        CRI: json.CRI
    }
}
