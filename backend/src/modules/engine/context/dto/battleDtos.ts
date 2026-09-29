import { Position } from "../dao/pendingDaos";
import type { RollResult } from "../../utils/calculations";

export interface ActionChoiceDTO {
  attribute?: string;
  type: string;
  targetId?: string | undefined | null;
  [key: string]: any;
}

export type BattleHistoryKind = "action" | "reaction" | "card";

export interface AddActionHistoryDTO {
  battleStateId: string;
  tokenId: string;
  choice: ActionChoiceDTO;
  wasCertainty: boolean;
  displayRoll: RollResult;
  historyKind?: Exclude<BattleHistoryKind, "card">;
  targetTokenId?: string;
}

export interface AddCardHistoryDTO {
  battleStateId: string;
  tokenId: string;
  card: {
    id: string;
    name: string;
    img: string;
    desc: string;
    causality: string;
    baseDice?: { quantity: number; type: string } | null;
  };
  displayRoll?: RollResult;
}


export type PivotCandidate =
    | { type: "cell"; position: Position }
    | { type: "token"; tokenId: string }
    | { type: "trigger" };
