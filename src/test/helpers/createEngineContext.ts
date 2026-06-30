import type { EngineContext } from "../../types/BoardEngineContext";
import type { BattleState } from "../../types/battle";
import type React from "react";
import { AIStateMachine } from "../../ai/state/AIStateMachine";
import { AICombatPhase } from "../../types/ai/AICombatPhase";

const noop = () => { };

const defaultBattleState: BattleState = {
  status: "Not in Battle",
  round: 0,
  turnOrder: [],
  currentTurnIndex: 0,
  currentActorId: null,
  phase: "Initiative",
  locks: {
    aiActing: false,
    reallocating: false,
    resolvingAction: false,
  },
  accumulatedActions: {},
  activeEffects: {},
  actionHistory: [],
  isReallocatingTurns: false,
  isAIActing: false,
  turnVersion: 0,
};

export function createEngineContext(
  overrides: Partial<EngineContext> = {}
): EngineContext {
  let ctx = {} as EngineContext;

  const syncRefs = () => {
    ctx.boardTokensRef.current = ctx.boardTokens;
    ctx.battleStateRef.current = ctx.battleState;
    ctx.pendingAttackRef.current = ctx.pendingAttack;
  };

  const stateSetter = <K extends keyof EngineContext>(
    key: K
  ): React.Dispatch<React.SetStateAction<EngineContext[K]>> =>
    ((action: React.SetStateAction<EngineContext[K]>) => {
      const prev = ctx[key];
      ctx[key] =
        typeof action === "function"
          ? (action as (prevState: EngineContext[K]) => EngineContext[K])(prev)
          : action;
      syncRefs();
    }) as React.Dispatch<React.SetStateAction<EngineContext[K]>>;

  ctx = {
    boardTokens: [],
    boardTokensRef: { current: [] },

    setBoardTokens: stateSetter("boardTokens"),

    shouldAdvanceTurn: false,
    setShouldAdvanceTurn: stateSetter("shouldAdvanceTurn"),

    pendingAttack: null,
    setPendingAttack: stateSetter("pendingAttack"),

    pendingEsquivaRoll: null,
    setPendingEsquivaRoll: stateSetter("pendingEsquivaRoll"),

    tokensBattlePosition: {},
    setTokensBattlePosition: stateSetter("tokensBattlePosition"),

    cardEntities: [],
    setCardEntities: stateSetter("cardEntities"),

    cellSize: 64,

    attributeTable: { current: {} },
    remainingPrevisionAttacks: { current: {} },
    timeToRechargeCard: { current: {} },
    cardsNotRechargeds: { current: {} },

    armedCard: undefined,
    setArmedCard: stateSetter("armedCard"),

    pendingCardResolution: null,
    setPendingCardResolution: stateSetter("pendingCardResolution"),

    selectedPivots: [],
    setSelectedPivots: stateSetter("selectedPivots"),

    mapas: [],
    setMapas: stateSetter("mapas"),

    selectedMapa: undefined,
    setSelectedMapa: stateSetter("selectedMapa"),

    tokenParalysis: {},
    setTokenParalysis: stateSetter("tokenParalysis"),

    battleState: defaultBattleState,
    battleStateRef: { current: defaultBattleState },
    setBattleState: stateSetter("battleState"),

    freeActionLock: {},
    setFreeActionLock: stateSetter("freeActionLock"),

    remainingExtraActions: { current: null },
    totalActionsReturn: { current: 0 },

    pendingFreeResponse: null,
    setPendingFreeResponse: stateSetter("pendingFreeResponse"),

    didActThisTurn: {},
    setDidActThisTurn: stateSetter("didActThisTurn"),

    inCardSelection: false,
    setInCardSelection: stateSetter("inCardSelection"),

    isInDefenseResolution: false,
    setIsInDefenseResolution: stateSetter("isInDefenseResolution"),

    selectedTarget: null,
    setSelectedTarget: stateSetter("selectedTarget"),

    prevReaction: {},
    setPrevReaction: stateSetter("prevReaction"),

    inDefenseCardResolution: false,
    setInDefenseCardResolution: stateSetter("inDefenseCardResolution"),

    boardVfxElements: [],
    setBoardVfxElements: stateSetter("boardVfxElements"),

    postParalyse: null,
    setPostParalyse: stateSetter("postParalyse"),

    lastAllUsedResponse: {},
    setLastAllUsedResponse: stateSetter("lastAllUsedResponse"),

    lastTurnActed: {},
    setLastTurnActed: stateSetter("lastTurnActed"),

    lastTurnMoved: {},
    setLastTurnMoved: stateSetter("lastTurnMoved"),

    hasEnteredFirstTurnRef: { current: {} },

    movedThisTurn: {},
    setMovedThisTurn: stateSetter("movedThisTurn"),

    maxSelectablePivots: { current: 0 },

    setAIUnlock: () => {
      ctx.setBattleState((prev) => ({
        ...prev,
        locks: { ...prev.locks, aiActing: false },
      }));
    },

    aiTurnTokenRef: { current: null },
    aiPhaseCleanup: { current: null },
    isAIActingRef: { current: false },

    aiStateMachine: {
      current: new AIStateMachine(AICombatPhase.IDLE),
    },

    setTokensInOffensiveCard: noop as React.Dispatch<React.SetStateAction<any>>,
    setOffensiveCardScore: noop as React.Dispatch<React.SetStateAction<any>>,
    setOffensiveCardTestScore: noop as React.Dispatch<React.SetStateAction<any>>,
    setOffensivePendingCard: noop as React.Dispatch<React.SetStateAction<any>>,

    setIsAmbientPivotSelection: noop as React.Dispatch<React.SetStateAction<any>>,
    setPreviewCells: noop as React.Dispatch<React.SetStateAction<any>>,
    setIsAIThinking: noop as React.Dispatch<React.SetStateAction<any>>,
    setInTargetSelection: noop as React.Dispatch<React.SetStateAction<any>>,
    isAdvancingTurnRef: { current: false },
    pendingAttackRef: { current: null },
    ...overrides,
  };

  syncRefs();

  return ctx;
}
