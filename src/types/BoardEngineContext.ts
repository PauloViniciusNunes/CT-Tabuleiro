import type { Token } from "./token";
import type { CardEntityInstance } from "./card";
import type { Card } from "./card";
import type { PivotCandidate } from "./pivot";
import type { Mapa } from "./mapas";
import type { ParalysisState, PostParalyse } from "./status";
import type { BattleState, PendingAttack } from "./battle";
import React from "react";
import type { RollResult } from "./battle";
import type { ElementoVFX } from "./elementoVFX";
import type { AIStateMachine } from "../ai/state/AIStateMachine";

export interface EngineContext {
    boardTokens: Token[];
    boardTokensRef: React.RefObject<Token[]>;
    setBoardTokens: React.Dispatch<
        React.SetStateAction<Token[]>
    >;
    shouldAdvanceTurn: boolean;
    setShouldAdvanceTurn: React.Dispatch<React.SetStateAction<boolean>>;
    pendingAttack: PendingAttack | null;
    setPendingAttack: React.Dispatch<React.SetStateAction<PendingAttack | null>>
    
    pendingEsquivaRoll: RollResult | null;
    setPendingEsquivaRoll: React.Dispatch<React.SetStateAction<RollResult | null>>;

    tokensBattlePosition: Record<string, number>;
    setTokensBattlePosition: React.Dispatch<React.SetStateAction<Record<string, number>>>

    cardEntities: CardEntityInstance[];
    setCardEntities: React.Dispatch<
        React.SetStateAction<CardEntityInstance[]>
    >;

    cellSize: number;

    attributeTable: React.MutableRefObject<
        Record<string, Record<string, number>>
    >;

    remainingPrevisionAttacks: React.MutableRefObject<
        Record<string, number>
    >;

    timeToRechargeCard: React.MutableRefObject<
        Record<string, number>
    >;

    cardsNotRechargeds: React.MutableRefObject<
        Record<string, string[]>
    >;

    armedCard: Card | undefined;

    pendingCardResolution: Token | null;
    setPendingCardResolution: React.Dispatch<React.SetStateAction<Token | null>>;
    selectedPivots: PivotCandidate[];

    setSelectedPivots: React.Dispatch<
        React.SetStateAction<PivotCandidate[]>
    >;

    mapas: Mapa[];

    setMapas: React.Dispatch<
        React.SetStateAction<Mapa[]>
    >;

    selectedMapa: Mapa | undefined;

    setSelectedMapa: React.Dispatch<
        React.SetStateAction<Mapa | undefined>
    >;

    tokenParalysis: Record<string, ParalysisState>;

    setTokenParalysis: React.Dispatch<
        React.SetStateAction<
            Record<string, ParalysisState>
        >
    >;

    battleState: BattleState;

    battleStateRef: React.RefObject<BattleState>;

    setBattleState: React.Dispatch<
        React.SetStateAction<BattleState>
    >;

    freeActionLock: Record<string, string>;

    setFreeActionLock: React.Dispatch<
        React.SetStateAction<
            Record<string, string>
        >
    >;

    remainingExtraActions: React.MutableRefObject<
        {
            attackerId: string;
            extraActions: number;
        } | null
    >;

    totalActionsReturn: React.MutableRefObject<number>;    

    pendingFreeResponse: {
        responderId: string;
        paralyzedId: string;
    } | null;

    setPendingFreeResponse: React.Dispatch<
        React.SetStateAction<{
            responderId: string;
            paralyzedId: string;
        } | null>
    >;    

    didActThisTurn: Record<string, boolean>;
    setDidActThisTurn: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
    inCardSelection: boolean;
    setInCardSelection: React.Dispatch<React.SetStateAction<boolean>>;
    isInDefenseResolution: boolean;
    setIsInDefenseResolution: React.Dispatch<React.SetStateAction<boolean>>;
    selectedTarget: Token | null;
    setSelectedTarget: React.Dispatch<React.SetStateAction<Token | null>>
    prevReaction: Record<string, string>;
    setPrevReaction: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    inDefenseCardResolution: boolean;
    setInDefenseCardResolution: React.Dispatch<React.SetStateAction<boolean>>;
    boardVfxElements: ElementoVFX[];
    setBoardVfxElements: React.Dispatch<React.SetStateAction<ElementoVFX[]>>; 
    postParalyse: PostParalyse | null;
    setPostParalyse: React.Dispatch<React.SetStateAction<PostParalyse | null>>;
    lastAllUsedResponse: Record<string, boolean>;
    setLastAllUsedResponse: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
    lastTurnActed: Record<string, boolean>;
    setLastTurnActed: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
    lastTurnMoved:Record<string, boolean>;
    setLastTurnMoved:React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
    hasEnteredFirstTurnRef: React.RefObject<Record<string, boolean>>;
    movedThisTurn: Record<string, boolean>;
    setMovedThisTurn: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
    maxSelectablePivots: React.MutableRefObject<number>;
    setAIUnlock: () => void;
    aiTurnTokenRef: React.MutableRefObject<string | null>;
    aiPhaseCleanup: React.MutableRefObject<(() => void) | null>;
    isAIActingRef: React.MutableRefObject<boolean>;
    aiStateMachine: React.MutableRefObject<AIStateMachine>;
    setTokensInOffensiveCard: React.Dispatch<React.SetStateAction<Token[]>>;
    setOffensiveCardScore: React.Dispatch<React.SetStateAction<number | null>>;
    setOffensiveCardTestScore: React.Dispatch<React.SetStateAction<number | null>>;
    setOffensivePendingCard: React.Dispatch<React.SetStateAction<Card | undefined>>;
    setArmedCard: React.Dispatch<React.SetStateAction<Card | undefined>>;
    setIsAmbientPivotSelection: React.Dispatch<React.SetStateAction<boolean>>;
    setPreviewCells: React.Dispatch<React.SetStateAction<Set<string>>>;
    setIsAIThinking: React.Dispatch<React.SetStateAction<boolean>>;
    setInTargetSelection: React.Dispatch<React.SetStateAction<boolean>>;
    isAdvancingTurnRef: React.RefObject<boolean>;
    pendingAttackRef: React.RefObject<PendingAttack | null>
}
