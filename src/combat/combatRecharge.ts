export function formatRechargeCardRecordReturn(timeToRechargeCard: Record<string, number>, tokenId: string, cardId: string) {
    const key = `${tokenId}->${cardId}`
    return timeToRechargeCard[key]
}
