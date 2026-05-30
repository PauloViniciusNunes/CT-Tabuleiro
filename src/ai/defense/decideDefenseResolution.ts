import { generateDefenseRoll } from "./generateDefenseRoll";

import type { Token } from "../../types/token";

export function decideDefenseResolution(
  self: Token
) {

  const usedActions = 1;

  const usedMana = 0;

  const roll = generateDefenseRoll(

    self,

    usedMana,

    usedActions

  );

  return {

    usedActions,

    usedMana,

    roll

  };

}