import { decideResponseAction } from "./response/decideResponseAction";
import type { AIRepertory } from "./types/aiContext";
import type { Token } from "../types/token";
import type { ExecuteChoice } from "../types/executeChoice";

interface ExecuteAIResponseActionParams {

  self: Token;

  aiRepertory: AIRepertory;

  forcedTarget: Token;

  handleExecuteResponseAction: (
    attackerId: string,
    forcedTargetId: string,
    choice: ExecuteChoice
  ) => boolean;

}

export function executeAIResponseAction({

  self,
  aiRepertory,
  forcedTarget,
  handleExecuteResponseAction

}: ExecuteAIResponseActionParams): boolean {

  const decision = decideResponseAction({

    self,
    aiRepertory,
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
