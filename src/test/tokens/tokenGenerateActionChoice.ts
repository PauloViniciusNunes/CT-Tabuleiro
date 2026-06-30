import type { ExecuteChoice } from "../../types/executeChoice";
import type { Item } from "../../types/item";
import type { Token } from "../../types/token";
import { randomCandidate, randomInt } from "../../utils/battleCalculations";
import type { TokenAttributes } from "../../types/token";

export function generateChoice(
    tokenId: string,
    attribute: keyof Omit<TokenAttributes, "level" | "xp">,
    possibleTargets: Token[],
    avaiableMana: number,
    avaiableActions: number,
    avaiableCertainyDie: number,
    currentPos: number,
    actionType: string,
    usedItem?: Item | null,
    usedCardId?: string | undefined,
) : ExecuteChoice
{

    const target = randomCandidate(possibleTargets).id;
    const usedMana = randomInt(0, avaiableMana);
    const usedActions = randomInt(1,avaiableActions);
    const useCertainyDie = randomInt(0,avaiableCertainyDie) === 1

    const exc: ExecuteChoice =
    {
        attribute: attribute,
        attackerId: tokenId,
        type: actionType,
        targetId: target,
        usedMana: usedMana,
        usedActions: usedActions,
        usedCertaintyDie: useCertainyDie,
        pos: currentPos,
        actionType: actionType,
        item: usedItem,
        cardId: usedCardId

    }

    return exc;

}