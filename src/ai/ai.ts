import type { AIContext } from "./types/aiContext";

import { chooseTarget } from "./core/chooseTarget";
import { chooseCard } from "./core/chooseCard";
import { generateActionChoice } from "./core/generateActionChoice";

export function decideAction(context: AIContext) {

  console.log("AI CONTEXT:", context);

  if (!context.self) {
    console.warn("SELF UNDEFINED");
    return null;
  }

  console.log("SELF:", context.self);

  // escolhe alvo
  const target = chooseTarget(context.enemies);

  console.log("TARGET:", target);

  if (!target) {
    console.warn("IA não encontrou alvo.");
    return null;
  }

  // escolhe carta
  console.log("CARDS:", context.self.cards);

  const card = chooseCard(context.self.cards ?? []);

  console.log("CARD:", card);


  // gera ação completa
  const choice = generateActionChoice(
    context.self,
    target,
    card
  );

  console.log("CHOICE GERADA PELA IA:", choice);

  return {

    type: "action",

    score: 1,

    targetId: target.id,

    choice

  };

}