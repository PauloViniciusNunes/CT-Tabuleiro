import { decideDefenseResolution } from "./defense/decideDefenseResolution";

import type { Token } from "../types/token";
import type { RollResult } from "../types/battle";

interface ExecuteAIDefenseResolutionParams {

  self: Token;

  handleDefenseResolution: (
    usedActions: number,
    definicaoRoll: RollResult,
    usedMana: number
  ) => void;

}

export function executeAIDefenseResolution({

  self,
  handleDefenseResolution

}: ExecuteAIDefenseResolutionParams) {

  const decision = decideDefenseResolution(self);

  if (!decision) {

    console.warn("IA não conseguiu resolver defesa.");
    return;

  }

  handleDefenseResolution(

    decision.usedActions,

    decision.roll,

    decision.usedMana

  );

}