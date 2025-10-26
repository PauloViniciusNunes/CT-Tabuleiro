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
 * Resultado = (Qd20 + CEIL(Q * P * ((A - 10)/2 + PF + O + CEIL(N * (((L - 10)/4 + 4 + ((M - 1)*((L - 10)/4 + 4)))/2))))) * CRI
 * 
 * CRI é automaticamente definido:
 * - Se o primeiro d20 for 20, CRI será um valor aleatório entre 2 e 4.
 * - Caso contrário, CRI é 1.
 *
 * @param params Parâmetros da jogada (sem CRI).
 * @returns Objeto com rolls, total, mana usada e CRI aplicado.
 */
export function calculateActionRoll(
  params: Omit<ActionRollParams, "CRI">
): RollResult {
  const { Q, P, A, PF, O, N: paramN, L, M } = params;

  // Rolar Q d20
  const rawRolls = rollD20(Q);
  const sumD20 = rawRolls.reduce((sum, r) => sum + r, 0);

  // CRI automático: se primeiro roll == 20, multiplica por crítico 2-4
  let CRI = 1;
  if (rawRolls[0] === 20) {
    CRI = Math.floor(Math.random() * 3) + 2; // Gera 2, 3 ou 4
  }

  // Cálculo do modificador de atributo
  const attrMod = (A - 10) / 2;

  // N verificador: se M > 0, então N = 1; se M = 0, então N = 0
  const N = M > 0 ? 1 : paramN;

  // Cálculo do bônus de mana: (M - 1) * ((L - 10)/4 + 4) quando M > 0
  const base = (L - 10) / 4 + 4;
  const manaBonus = M > 0 ? (M - 1) * base : 0;

  // Cálculo interno N * (((L-10)/4+4) + (M-1)*((L-10)/4+4)) / 2, arredondado para cima
  const inner = Math.ceil((N * (base + manaBonus)) / 2);

  // Subtotal de Q * P * (attrMod + PF + O + inner)
  const subtotal = Q * P * (attrMod + PF + O + inner);

  // Total com d20 e subtotal arredondado, multiplicado por CRI
  const total = (sumD20 + Math.ceil(subtotal)) * CRI;

  // Mana gasta: M (a mana que foi passada)
  const usedMana = M;

  return { rawRolls, total, usedMana, CRI };
}

/**
 * Rola iniciativa para um token usando a função calculateActionRoll.
 * Fórmula: 1d20 + (Destreza - 10)/2 + Proficiência
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
  const profBonus = profDestreza ? Math.ceil((level - 10) / 4 + 4) : 0;

  const rollResult = calculateActionRoll({
    tokenId: "initiative",
    Q: 1, // 1d20
    P: 1, // P = 1 (Posição, sempre 1)
    A: destreza, // Atributo: Destreza
    PF: profBonus, // PF = bônus de proficiência
    O: 0, // O = 0 (sem adição ocasional)
    N: 0, // N = 0
    L: level, // Level
    M: 0, // M = 0
  });

  return rollResult.total;
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

export function recalculateRound(nextIdx: number, totalTokens: number, currentRound: number): number {
  if (totalTokens <= 0) return 1;
  // Se nextIdx voltou para 0, significa que completou uma volta
  if (nextIdx === 0) {
    return currentRound + 1;
  }
  return currentRound;
}

export function calculateDistance(token1: Token, token2: Token): number {
  const colDiff = Math.abs(token1.position.col - token2.position.col);
  const rowDiff = Math.abs(token1.position.row - token2.position.row);
  
  // Distância de Chebyshev: max(|Δcol|, |Δrow|)
  // Diagonal = 1 célula
  return Math.max(colDiff, rowDiff);
}


export function isInAttackRange(
  attacker: Token,
  target: Token,
  attackType: "fisico" | "magico"
): boolean {
  const distance = calculateDistance(attacker, target);
  
  if (attackType === "fisico") {
    return distance <= (attacker.bodytobodyRange || 1);
  } else if (attackType === "magico") {
    return distance <= (attacker.magicalRange || 6);
  }
  
  return false;
}



