import { decideResponseAction } from "./response/decideResponseAction";

import type { Token } from "../types/token";
import type { ExecuteChoice } from "../types/executeChoice";

interface ExecuteAIResponseActionParams {

  self: Token;

  forcedTarget: Token;

  handleExecuteResponseAction: (
    attackerId: string,
    forcedTargetId: string,
    choice: ExecuteChoice
  ) => boolean;

}

export function executeAIResponseAction({

  self,
  forcedTarget,
  handleExecuteResponseAction

}: ExecuteAIResponseActionParams): boolean {

  const decision = decideResponseAction({

    self,
    forcedTarget

  });

  if (!decision) {

    console.warn("IA não conseguiu decidir resposta.");
    return false;

  }

  return handleExecuteResponseAction(

    self.id,

    forcedTarget.id,

    decision.choice

  );

}
