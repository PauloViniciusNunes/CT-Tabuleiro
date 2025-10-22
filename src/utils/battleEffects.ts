import type { BattleState, TurnEffect } from "../types/battle";
import type { Token } from "../types/token";

/**
 * Aplica efeitos de turno para o token ativo ou para todos quando moment="AnyTurn".
 * Retorna novo BattleState com efeitos atualizados e durações decrementadas.
 */
export function processTurnEffects(
  battleState: BattleState,
  tokens: Token[]
): BattleState {
  const currentRound = battleState.round;
  const currentTokenId =
    battleState.turnOrder[battleState.currentTurnIndex]?.tokenId;
  const newActiveEffects: Record<string, TurnEffect[]> = {};

  // Para cada token e seus efeitos
  for (const tokenId of Object.keys(battleState.activeEffects)) {
    const effects = battleState.activeEffects[tokenId] || [];
    const remaining: TurnEffect[] = [];

    for (const effect of effects) {
      const shouldApply =
        (effect.moment === "OwnTurn" && tokenId === currentTokenId) ||
        effect.moment === "AnyTurn";

      if (shouldApply) {
        // Exemplo de “causa”: Causar dano igual à intensidade
        // Poderia disparar callback, mensagem de log etc.
        console.log(
          `[Round ${currentRound}] Efeito "${effect.type}" aplica causa = ${effect.intensity} no token ${tokenId}`
        );
      }

      // Decrementa duração e mantém se ainda tiver >0
      const elapsedRounds = currentRound - effect.appliedAtRound + 1;
      if (elapsedRounds < effect.duration) {
        remaining.push(effect);
      } else {
        console.log(
          `[Round ${currentRound}] Efeito "${effect.type}" expirou no token ${tokenId}`
        );
      }
    }

    if (remaining.length > 0) newActiveEffects[tokenId] = remaining;
  }

  return {
    ...battleState,
    activeEffects: newActiveEffects,
  };
}
