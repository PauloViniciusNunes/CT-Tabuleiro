import type { Card } from "../../types/card";
import type { AIRepertory } from "../types/aiContext";
import type { Token } from "../../types/token";


export function getAIRepertoryForToken(token: Token, accumulatedActions: number, avaiableMana: number, avaiableCards: Card[]): AIRepertory {
  return {
    accumulatedActions,
    avaiableMana,
    avaiableCards
  };
}