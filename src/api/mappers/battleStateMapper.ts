import type { ActiveMechanic, BattleState } from "../../types/battle";

export function BattleStateMapper(json: any): BattleState {
    // 🟢 Trata string JSON, Array e fallbacks de forma segura
    let parsedEntities: any[] = [];

    if (typeof json.mechanicEntitiesInstances === "string") {
        try {
            const parsed = JSON.parse(json.mechanicEntitiesInstances);
            if (Array.isArray(parsed)) parsedEntities = parsed;
        } catch {
            parsedEntities = [];
        }
    } else if (Array.isArray(json.mechanicEntitiesInstances)) {
        parsedEntities = json.mechanicEntitiesInstances;
    }

    let activeMechanics: ActiveMechanic[] = [];
    if (typeof json.activeMechanics === "string") {
        try {
            const parsed = JSON.parse(json.activeMechanics);
            if (Array.isArray(parsed)) activeMechanics = parsed as ActiveMechanic[];
        } catch {
            activeMechanics = [];
        }
    } else if (Array.isArray(json.activeMechanics)) {
        activeMechanics = json.activeMechanics as ActiveMechanic[];
    }

    return {
        id: json.id,
        status: json.status ?? "Not in Battle",
        round: json.round ?? 0,
        currentTurnIndex: json.currentTurnIndex ?? 0,
        currentActorId: json.currentActorId ?? null,
        currentActorUserId: json.currentActorUserId ?? "",
        phase: json.phase ?? "",
        isReallocatingTurns: !!json.isReallocatingTurns,
        isAIActing: !!json.isAIActing,
        turnVersion: json.turnVersion ?? 0,
        movedThisTurn: json.movedThisTurn && typeof json.movedThisTurn === "object" && !Array.isArray(json.movedThisTurn)
            ? json.movedThisTurn as Record<string, boolean>
            : {},
        
        locks: {
            aiActing: !!json.locks?.aiActing,
            reallocating: !!json.locks?.reallocating,
            resolvingAction: !!json.locks?.resolvingAction,
        },
        
        turnOrder: Array.isArray(json.turnOrder) ? json.turnOrder : [],
        actionHistory: Array.isArray(json.actionHistory) ? json.actionHistory : [],
        
        accumulatedActions: json.accumulatedActions && typeof json.accumulatedActions === "object" 
            ? json.accumulatedActions 
            : {},
            
        activeEffects: json.activeEffects && typeof json.activeEffects === "object" 
            ? json.activeEffects 
            : {},
        previsionActions: json.previsionActions as Record<string, number>,
        mapId: json.mapId,
        cardsNotRechargeds: json.cardsNotRechargeds ?? {},
        timeToRechargeCard: json.timeToRechargeCard ?? {},
        tokensInOffensiveCard: json.tokensInOffensiveCard ?? [],
        maxSelectablePivots: json.maxSelectablePivots as number,
        remainingPivots: json.remainingPivots,
        activeMechanics,
        
        // 🟢 Agora aceita tanto Array nativo quanto String JSON do Prisma
        mechanicEntitiesInstances: parsedEntities
    };
}

export function JsonBattleStateMapper(state: BattleState): any {
    return {
        id: state.id,
        status: state.status,
        round: state.round,
        currentTurnIndex: state.currentTurnIndex,
        currentActorId: state.currentActorId,
        currentActorUserId: state.currentActorUserId,
        phase: state.phase,
        isReallocatingTurns: state.isReallocatingTurns,
        isAIActing: state.isAIActing,
        turnVersion: state.turnVersion,
        movedThisTurn: state.movedThisTurn ?? {},
        locks: state.locks,
        turnOrder: state.turnOrder,
        actionHistory: state.actionHistory,
        accumulatedActions: state.accumulatedActions,
        activeEffects: state.activeEffects,
        mapId: state.mapId,
        previsionActions: state.previsionActions,
        tokensInOffensiveCard: state.tokensInOffensiveCard,
        maxSelectablePivots: state.maxSelectablePivots,
        remainingPivots: state.remainingPivots,
        activeMechanics: state.activeMechanics ?? [],
        mechanicEntitiesInstances: state.mechanicEntitiesInstances,
        cardsNotRechargeds: state.cardsNotRechargeds,
        timeToRechargeCard: state.timeToRechargeCard
    };
}
