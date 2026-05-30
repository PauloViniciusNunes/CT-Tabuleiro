import type { Token } from "../../types/token";

export interface AIContext {

    self: Token | undefined;
    allies: Token[];
    enemies: Token[];
    currentTurn: number;

}