import type { EngineContext } from "../types/BoardEngineContext";
import { isInAttackRange } from "../utils/battleCalculations";
import type { ParalysisState } from "../types/status";
import { setParalysis } from "./stateParalysis";

export function grantFreeActionNoReaction(context: EngineContext, nextActorId: string, nextDefenderId: string, paralasysType: ParalysisState, totalActions: number) {

    if (paralasysType !== 'none') {
      console.log("🔴 ENTROU PARA DEFINIR O TOTAL DE AÇÕES DO TOKEN COMO: 2");
      context.setBattleState(prev => ({
        ...prev,
        accumulatedActions: {
          ...prev.accumulatedActions,
          [nextActorId]: Math.max(1, prev.accumulatedActions[nextActorId] + totalActions),
        },
      }));
    }

    context.setFreeActionLock(prev => ({ ...prev, [`${nextActorId}->${nextDefenderId}`]: totalActions.toString() }));
    const responder = context.boardTokens.find(t => t.id === nextActorId);
    const target = context.boardTokens.find(t => t.id === nextDefenderId);

    context.remainingExtraActions.current = { attackerId: nextActorId, extraActions: totalActions };
    context.totalActionsReturn.current = totalActions + 1;

    setParalysis(context, nextDefenderId, paralasysType);

    if (responder && target) {
      const hasPhys = isInAttackRange(responder, target, "fisico");
      const hasMag = isInAttackRange(responder, target, "magico");

      if (hasPhys || hasMag) {
        context.setPendingFreeResponse({ responderId: nextActorId, paralyzedId: nextDefenderId });
      }
    }
  }