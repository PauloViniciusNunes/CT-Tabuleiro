import type { EngineContext } from "../types/BoardEngineContext"

export function formatRechargeCardRecord(context: EngineContext, tokenId: string, cardId: string, recharge: number) {
    const key = `${tokenId}->${cardId}`
    context.timeToRechargeCard.current[key] = recharge
}

export function formatRechargeCardRecordReturn(context: EngineContext, tokenId: string, cardId: string) {
    const key = `${tokenId}->${cardId}`
    return context.timeToRechargeCard.current[key]
}

export function removeCardNotRecharge(context: EngineContext, currentId: string, valor: string) {
    const index = context.cardsNotRechargeds.current[currentId].indexOf(valor);

    if (index !== -1) {
        context.cardsNotRechargeds.current[currentId].splice(index, 1);
    }

}


export function reduceTimeToRecharge(context: EngineContext, currentId: string) {
    const record = context.timeToRechargeCard.current;

    Object.keys(record).forEach((key) => {
        if (key.includes(currentId)) {
            const newValue = record[key] - 1;
            const cardId = key.replace(`${currentId}->`, "")

            if (newValue <= 0) {
                delete record[key];
                removeCardNotRecharge(context, currentId, cardId)
            }
            else {
                record[key] = newValue;
            }
        }
    });
}