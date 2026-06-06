import type { Token } from "./token";
import type { CardEntityInstance } from "./card";
import type { Card } from "./card";
import type { PivotCandidate } from "./pivot";
import type { Mapa } from "./mapas";
import type { ParalysisState } from "./status";
import type { BattleState } from "./battle";

export interface EngineContext {
    boardTokens: Token[];

    setBoardTokens: React.Dispatch<
        React.SetStateAction<Token[]>
    >;

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

}