import { type ActionChoice } from "./battle";
import { type Item } from "./item";

export type ExecuteChoice = ActionChoice & {
  targetId: string;
  usedMana: number;
  usedActions: number;
  usedCertaintyDie?: boolean;
  pos: number;
  actionType: string;
  item?: Item | null,
  cardId?: string,
};