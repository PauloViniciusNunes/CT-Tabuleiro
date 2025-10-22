import type { Token } from "../types/token";
import type { ActionRollParams, RollResult } from "../types/battle";

/**
 * Rola um dado de 20 faces N vezes.
 * @param times Número de dados a rolar.
 * @returns Array com resultados individuais.
 */
export function rollD20(times: number): number[] {
  return Array.from({ length: times }, () => Math.ceil(Math.random() * 20));
}

/**
 * Calcula o resultado de uma ação com base na fórmula:
 * Resultado = (Qd20 + CEIL(Q * P * ((A - 10)/2 + O + CEIL(N * (((L - 10)/4 + 4 + ((M - 1)*((L - 10)/4 + 4)))/2))))) * CRI
 *
 * @param params Parâmetros da jogada.
 * @returns Objeto com rolls, total e mana usada.
 */
export function calculateActionRoll(
  params: ActionRollParams
): RollResult {
  const { Q, P, A, O, N, L, M, CRI } = params;

  // Rolar Q d20
  const rawRolls = rollD20(Q);
  const sumD20 = rawRolls.reduce((sum, r) => sum + r, 0);

  // Cálculo do modificador de atributo
  const attrMod = (A - 10) / 2;

  // Cálculo interno N * (((L-10)/4+4) + (M-1)*((L-10)/4+4)) / 2, arredondado para cima
  const base = (L - 10) / 4 + 4;
  const inner = Math.ceil((N * (base + (M - 1) * base)) / 2);

  // Subtotal de Q * P * (attrMod + O + inner)
  const subtotal = Q * P * (attrMod + O + inner);

  // Total com d20 e subtotal arredondado, multiplicado por CRI
  const total = (sumD20 + Math.ceil(subtotal)) * CRI;

  // Mana gasta: N * M se M>0
  const usedMana = M > 0 ? N * M : 0;

  return { rawRolls, total, usedMana };
}

/**
 * Rola iniciativa para um token: 1d20 + modificador de destreza + proficiência se aplicável.
 * @param destreza Valor de Destreza.
 * @param profDestreza Se possui proficiência em Destreza.
 * @param level Level do token.
 * @returns Valor de iniciativa.
 */
export function rollInitiative(
  destreza: number,
  profDestreza: boolean,
  level: number
): number {
  const roll = Math.ceil(Math.random() * 20);
  const dexMod = Math.floor((destreza - 10) / 2);
  const profBonus = profDestreza
    ? Math.ceil((level - 10) / 4 + 4)
    : 0;
  return roll + dexMod + profBonus;
}

/**
 * Inicializa os pontos de vida e mana de um token no início da batalha.
 * Fórmulas corrigidas:
 * Max_Life = CEIL(MC * (FLOOR(6 + FLOOR((C - 10)/2) + CEIL((C - 10)/2) + 4*(L - 1) + CEIL(((C - 10)/2)*(L - 1)))))
 * Max_Mana = CEIL(MM * CEIL((S - 10)/2 + PS))
 *
 * @param token Token base.
 * @returns Nova instância de Token com current/max Life e Mana definidos.
 */
export function initializeBattleStats(token: Token): Token {
  const C = token.attributes.consistencia;
  const S = token.attributes.sabedoria;
  const L = token.attributes.level;
  const PS = token.proficiencies.sabedoria
    ? Math.ceil((L - 10) / 4 + 4)
    : 0;

  // Por ora, assumindo MC e MM como 1 (multiplicadores de classe)
  // Estes valores deverão ser configuráveis por classe futuramente
  const MC = 1; // Multiplicador de Vida da Classe
  const MM = 1; // Multiplicador de Mana da Classe

  // Cálculo de Max_Life
  const floorHalfC = Math.floor((C - 10) / 2);
  const ceilHalfC = Math.ceil((C - 10) / 2);
  const lifeInner = Math.floor(
    6 + floorHalfC + ceilHalfC + 4 * (L - 1) + Math.ceil(floorHalfC * (L - 1))
  );
  const maxLife = Math.ceil(MC * lifeInner);

  // Cálculo de Max_Mana
  const manaInner = Math.ceil((S - 10) / 2 + PS);
  const maxMana = Math.ceil(MM * manaInner);

  return {
    ...token,
    currentLife: maxLife,
    maxLife,
    currentMana: maxMana,
    maxMana,
  };
}
