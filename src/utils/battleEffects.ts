import type { BattleState, TurnEffect } from "../types/battle";
import type { Token } from "../types/token";

export default function processTurnEffects(
  battleState: BattleState,
  tokens: Token[]
): BattleState {
  const { round, turnOrder, currentTurnIndex, activeEffects } = battleState;
  const currentTokenId = turnOrder[currentTurnIndex]?.tokenId;
  const newActiveEffects: Record<string, TurnEffect[]> = {};

  for (const tokenId in activeEffects) {
    const effects: TurnEffect[] = activeEffects[tokenId] || [];
    const remaining: TurnEffect[] = [];

    effects.forEach((effect: TurnEffect) => {
      const isOwn = effect.moment === "OwnTurn" && tokenId === currentTokenId;
      const isAny = effect.moment === "AnyTurn";
      if (isOwn || isAny) {
        applyEffectCause(effect, tokenId);
      }
      const elapsed = round - effect.appliedAtRound + 1;
      if (elapsed < effect.duration) {
        remaining.push(effect);
      }
    });

    if (remaining.length) {
      newActiveEffects[tokenId] = remaining;
    }
  }

  return { ...battleState, activeEffects: newActiveEffects };
}

function applyEffectCause(effect: TurnEffect, tokenId: string) {
  switch (effect.type) {
    case "Queimando":
    case "Envenenado":
    case "Sangrando":
      console.log(`Token ${tokenId} sofre ${effect.intensity} de dano.`);
      break;
    default:
      console.log(`Aplicando efeito ${effect.type} no token ${tokenId}.`);
  }
}
