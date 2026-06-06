import type { Position } from "./card";

export type PivotCandidate =
    | { type: "cell"; position: Position }
    | { type: "token"; tokenId: string }
    | { type: "trigger" };