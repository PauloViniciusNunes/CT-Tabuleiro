import { chooseCard } from "../core/chooseCard";
import { generateActionChoice } from "../core/generateActionChoice";

import type { Token } from "../../types/token";

interface DecideResponseActionParams {

  self: Token;

  forcedTarget: Token;

}

export function decideResponseAction({

  self,
  forcedTarget

}: DecideResponseActionParams) {

  const card = chooseCard(self.cards ?? []);

  if (!card) {

    console.warn("IA não encontrou carta de resposta.");
    return null;

  }

  const choice = generateActionChoice(

    self,
    forcedTarget,
    card

  );

  return {

    type: "response_action",

    choice

  };

}