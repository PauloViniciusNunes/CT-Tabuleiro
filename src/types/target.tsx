import { Target } from "lucide-react";
import type { Token } from "./token";


export type TargetType = "Self" | "Target" | "Multi-Target" | "Ambient";
export type PivotType  = "Trigger-Fix" | "Cell-Fix" | "Token-Fix";

export interface Pivot
{
    areaImgUrl: string;
    pivotType:  PivotType;
    range:      number;
}

export interface Target
{
    type: TargetType;
    pivot: number[] | null;
    pivotSettings: Pivot | undefined;
    numbersTarget: number | null;
    tokenTarget: Token[] | null;
}

