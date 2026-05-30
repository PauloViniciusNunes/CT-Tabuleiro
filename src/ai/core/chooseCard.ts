import { type Card } from "../../types/card";

export function chooseCard(cards: Card[])
{
    return cards.find(c => c.causalityType === "Offensive");
}