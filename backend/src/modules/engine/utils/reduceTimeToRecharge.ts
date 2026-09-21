import { BattleGetter } from "../context/BattleGetter";
import { BattleSetter } from "../context/BattleSetter";

const battleGetter = new BattleGetter();
const battleSetter = new BattleSetter();

export async function reduceTimeToRecharge(battleId: string, currentId: string) {
    if (!battleId || !currentId) return;

    const record = await battleGetter.getTimeToRechargeCard(battleId);
    const prefix = `${currentId}->`;

    // 🟢 1. Filtra estritamente as chaves pertencentes a este tokenId
    const tokenCardKeys = Object.keys(record).filter((key) => key.startsWith(prefix));

    // 🟢 2. Uso do loop 'for...of' para aguardar cada chamada assíncrona sequencialmente
    for (const key of tokenCardKeys) {
        const cardId = key.replace(prefix, "");

        // Decrementa 1 do tempo de recarga da carta
        await battleSetter.decreaseTimeToRechargeCard(battleId, currentId, cardId);

        // Busca o registro atualizado no banco
        const updatedRecord = await battleGetter.getTimeToRechargeCard(battleId);
        const remainingTime = updatedRecord[key];

        // 🟢 3. Se a chave foi deletada do objeto (undefined) ou se o tempo chegou a <= 0
        if (remainingTime === undefined || remainingTime <= 0) {
            await battleSetter.removeCardNotRecharged(battleId, currentId, cardId);
        }
    }
}