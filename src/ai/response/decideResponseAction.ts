import { chooseCard } from "../core/chooseCard";
import { generateActionChoice } from "../core/generateActionChoice";
import type { AIRepertory } from "../types/aiContext";

import type { Token } from "../../types/token";

interface DecideResponseActionParams {

  self: Token;
  aiRepertory: AIRepertory;
  forcedTarget: Token;

}

export function decideResponseAction({

  self,
  aiRepertory,
  forcedTarget

}: DecideResponseActionParams) {

  const card = chooseCard(self.cards ?? []);

  const choice = generateActionChoice(

    self,
    aiRepertory,
    forcedTarget,
    card

  );

  return {

    type: "response_action",

    choice

  };

}
