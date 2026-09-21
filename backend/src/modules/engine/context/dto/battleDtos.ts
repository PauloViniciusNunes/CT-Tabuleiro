import { Position } from "../dao/pendingDaos";

export interface ActionChoiceDTO {
  attribute?: string;
  type: string;
  targetId?: string | undefined | null;
  [key: string]: any;
}

export interface AddActionHistoryDTO {
  battleStateId: string;
  tokenId: string;
  choice: ActionChoiceDTO;
  wasCertainty: boolean;
  displayRoll: any;
}


export type PivotCandidate =
    | { type: "cell"; position: Position }
    | { type: "token"; tokenId: string }
    | { type: "trigger" };
