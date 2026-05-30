import { calculateActionRoll } from "../../utils/battleCalculations";

import type { Token } from "../../types/token";
import type { RollResult } from "../../types/battle";

export function generateDefenseRoll(

  self: Token,

  usedMana: number,

  usedActions: number

): RollResult {

  const attribute = "destreza";

  const proficiencyBonus =
    self.proficiencies[attribute]
      ? Math.ceil((self.attributes.level - 10) / 4 + 4)
      : 0;

  return calculateActionRoll({

    tokenId: self.id,

    Q: usedActions,

    P: 1,

    A: self.attributes[attribute],

    PF: proficiencyBonus,

    O: self.ocassionalAddition[attribute],

    N:
      self.proficiencies[attribute]
        ? 1
        : 0,

    L: self.attributes.level,

    M: usedMana,


  }) as RollResult;

}