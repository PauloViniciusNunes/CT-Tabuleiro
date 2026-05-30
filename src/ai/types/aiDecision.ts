import type { ExecuteChoice } from "../../types/executeChoice";

export interface AIDecision {

    type:
    | "action"
    | "reaction"
    | "defense"
    | "response";
    score: number;
    targetId?: string;
    choice?: ExecuteChoice;

}