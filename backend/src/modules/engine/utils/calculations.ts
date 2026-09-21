export type TokenClass = "Guerreiro" | "Mago" | "Bárbaro" | "Ladino" | "Feitiçeiro";

export interface ActionRollParams {
  tokenId: string;
  /**
   * The equipped item deliberately selected for this roll. It is explicit
   * even when absent so interceptors can distinguish an unarmed roll from a
   * roll made with a particular item.
   */
  usedItemId: string | undefined;
  /**
   * Attribute responsible for the action.  It is not part of the mathematical
   * formula itself, but lets roll interceptors apply attribute-specific rules
   * without relying on an external service payload.
   */
  attribute?: string;
  Q: number; // Quantidade de d20s
  P: number; // P (posição)
  A: number; // Atributo
  PF: number;// Proficiência
  O: number; // O (Adição Ocasional)
  N: number; // N (Houve uso de mana?)
  L: number; // Level
  M: number; // Mana usada
  CRI?: number; // Crítico
}

export interface RollResult {
  rawRolls: number[];
  total: number;
  usedMana: number;
  CRI: number;
}

export interface CertaintyDieRollResult {
  displayRoll: RollResult;
  attackTotalForHistory: number;
  rawDamage: number;
}
export const classMultipliers: Record<TokenClass, { MC: number; MM: number }> = {
  Guerreiro: { MC: 1.5, MM: 1.0 },
  Mago: { MC: 1.0, MM: 1.5 },
  Ladino: { MC: 1.25, MM: 1.25 },
  Bárbaro: { MC: 2.0, MM: 0.5 },
  Feitiçeiro: { MC: 1.25, MM: 1.5 },
};

export function rollD20(times: number): number[] {
  return Array.from({ length: times }, () => Math.ceil(Math.random() * 20));
}

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
  const total = rawRolls[0] === 1 ? 0 : (sumD20 + Math.ceil(subtotal)) * CRI;

  // Mana gasta: M (a mana que foi passada)
  const usedMana = M;

  return { rawRolls, total, usedMana, CRI };
}

/**
 * Applies the universal Dado Certo rule to an already calculated action roll.
 *
 * Each action die is locked at 20 and its per-die modifier is preserved. The
 * resulting roll is a four-times critical result, matching the prior engine
 * implementations while keeping the source roll immutable.
 */
export function calculateCertainyDieRoll(
  baseRoll: RollResult,
  usedActions: number,
): CertaintyDieRollResult {
  const MULT = 4;
  const actionCount = Number.isFinite(usedActions)
    ? Math.max(1, Math.floor(usedActions))
    : 1;

  // Estima o modificador aplicado a cada d20 a partir da rolagem original.
  const raw = baseRoll.rawRolls;
  const somaD20sBase =
    raw.length >= actionCount
      ? raw.slice(0, actionCount).reduce((a, b) => a + b, 0)
      : raw.length > 0
        ? raw.reduce((a, b) => a + b, 0)
        : actionCount * 10;

  const totalBase = baseRoll.total;
  const modsTotaisAproximados = totalBase - somaD20sBase;
  const modsPorDado = modsTotaisAproximados / actionCount;

  const rawRolls = Array.from({ length: actionCount }, () => 20);
  const total = Math.round(MULT * (20 + modsPorDado) * actionCount);

  return {
    displayRoll: {
      ...baseRoll,
      rawRolls,
      total,
    },
    attackTotalForHistory: total,
    rawDamage: total,
  };
}

export function rollInitiative(destreza: number, profDestreza: boolean, level: number): number {
  const profBonus = profDestreza ? Math.ceil((level - 10) / 4 + 4) : 0;

  const rollResult = calculateActionRoll({
    tokenId: "initiative",
    usedItemId: undefined,
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

export function initializeBattleStats(token: any): any {
  const C = token.consistencia;
  const S = token.sabedoria;
  const L = token.level;

  const PS = token.bonusSabedoria ? Math.ceil((L - 10) / 4 + 4) : 0;

  // Por ora, assumindo MC e MM como 1 (multiplicadores de classe)
  // Estes valores deverão ser configuráveis por classe futuramente
  const { MC, MM } = classMultipliers[(token.class) as TokenClass];


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

export function calculateDistance(token1: any, token2: any): number {
  const colDiff = Math.abs(token1.col - token2.col);
  const rowDiff = Math.abs(token1.row - token2.row);

  // Distância de Chebyshev: max(|Δcol|, |Δrow|)
  return Math.max(colDiff, rowDiff);
}

export function isInAttackRange(attacker: any, target: any, attackType: "fisico" | "magico"): boolean {
  const distance = calculateDistance(attacker, target);

  if (attackType === "fisico") {
    return distance <= (attacker.bodyToBodyRange || 1);
  } else if (attackType === "magico") {
    return distance <= (attacker.magicalRange || 6);
  }

  return false;
}

export const finalPos = (a: number, b: number) => {
  if (a + b === 3) {
    return 2;
  }
  else if (a + b === 1) {
    return 0.5;
  }
  else if (a + b === 1.5) {
    return 0.5;
  }
  else if (a + b === 2) {
    return 1;
  }
  else if (a + b === 4) {
    return 2;
  }
  else if (a + b === 2.5) {
    return 1;
  }
  else if (a + b > 4) {
    return 2;
  }
  else {
    return 1;
  }
}

export function formatPrevisionAttackKey(defenderId: string, attackerId: string) {
    return `${defenderId}->${attackerId}`;
}

export function calculateCardRoll(actions: number, token: any, card: any) : RollResult
{
  let mult = 0

  const type     = card.baseDice?.type;
  const quantity = card.baseDice?.quantity

  switch (type) 
  {
    case "d4":
      mult = (quantity ?? 1)* 4;
      break;
    case "d6":
      mult = (quantity ?? 1)* 6;
      break;
    case "d8":
      mult = (quantity ?? 1)* 8;
      break;
    case "d10":
      mult = (quantity ?? 1)* 8;
      break;
    case "d12":
      mult = (quantity ?? 1)* 12;
      break;
    case "d20":
      mult = (quantity ?? 1)* 20;
      break;
    case "d100":
      mult = (quantity ?? 1)* 100;
      break;                          
    default:
      break;
  }

  const circleAndLevelDiffer = Math.max(1, token.level - (card.spellCircle ?? 0))
  const tokenProficiency = Math.ceil((token.level - 10) / 4 + 4)
  const totalSum = Math.floor((actions + (card.actionsRequired ?? 0)) * (circleAndLevelDiffer) * (mult) +  (card.actionsRequired ?? 0) * tokenProficiency);
  const rawRolls = rollD20(actions);

  let CRI = 1;
  if (rawRolls[0] === 20)
  {
    CRI = Math.floor(Math.random() * 3) + 2;
  }

  const result: RollResult = {
    total: totalSum,
    rawRolls: rawRolls,
    usedMana: card.manaRequired ?? 0,
    CRI: CRI,
  }

  return result;

}

export const sum = (values: number[]) =>
  values.reduce((a, b) => a + b, 0);
