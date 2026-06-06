import type { Card } from "../../types/card";
import type { Token } from "../../types/token";

export interface AIContext {

    self: Token | undefined;
    allies: Token[];
    enemies: Token[];
    currentTurn: number;
}

export interface AIRepertory{ 
    accumulatedActions: number;
    avaiableMana: number;
    avaiableCards: Card[];
}