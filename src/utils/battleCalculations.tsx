import type {
  Token,
  TokenAttributes,
  TokenProficiencies,
} from "../types/token";

/** Rola um dado de N faces (1…faces) */
const rollDie = (faces: number): number =>
  Math.floor(Math.random() * faces) + 1;

/** Calcula proficiência baseada no level */
export const calculateProficiency = (level: number): number =>
  Math.ceil((level - 10) / 4 + 4);

/** Calcula modificador de atributo */
export const calculateAttributeModifier = (attributeValue: number): number =>
  Math.floor((attributeValue - 10) / 2);

/**
 * Rola iniciativa:
 * - Lança d20
 * - Se sair 1 → falha crítica (retorna valor mínimo 1 + modificadores)
 * - Se sair 20 → crítico: multiplica (20 + mods) por V, onde V é d4 repetido até sair 2–4
 * - Caso contrário → normal: d20 + mods
 */
export const rollInitiative = (
  destreza: number,
  profDex: boolean,
  level: number
): number => {
  const d20 = rollDie(20);
  const dexMod = calculateAttributeModifier(destreza);
  const profBonus = profDex ? calculateProficiency(level) : 0;
  const base = d20 + dexMod + profBonus;

  if (d20 === 1) {
    // Falha crítica: retorna valor mínimo plausível (1 + mods)
    return 1 + dexMod + profBonus;
  }

  if (d20 === 20) {
    // Crítico: determina V rolando d4 até sair 2–4
    let v: number;
    do {
      v = rollDie(4);
    } while (v === 1);
    return base * v;
  }

  // Normal
  return base;
};

/**
 * Calcula vida máxima:
 * Max_Life = ceil(MC * floor(6 + floor((C - 10)/2) + ceil((C - 10)/2) + 4*(L - 1) + ceil(((C - 10)/2)*(L - 1))))
 */
export const calculateMaxLife = (
  consistencia: number,
  level: number,
  multiplier: number = 1
): number => {
  const floorMod = Math.floor((consistencia - 10) / 2);
  const ceilMod = Math.ceil((consistencia - 10) / 2);
  const baseLife =
    6 +
    floorMod +
    ceilMod +
    4 * (level - 1) +
    Math.ceil((consistencia - 10) / 2 * (level - 1));
  return Math.ceil(multiplier * Math.floor(baseLife));
};

/**
 * Calcula mana máxima:
 * Max_Mana = ceil(MM * ceil((S - 10)/2 + PS))
 */
export const calculateMaxMana = (
  sabedoria: number,
  profSab: boolean,
  level: number,
  multiplier: number = 1
): number => {
  const sabMod = Math.ceil((sabedoria - 10) / 2);
  const profBonus = profSab ? calculateProficiency(level) : 0;
  return Math.ceil(multiplier * (sabMod + profBonus));
};

/**
 * Inicializa stats de batalha para um token:
 * - Calcula maxLife e currentLife
 * - Calcula maxMana e currentMana
 */
export const initializeBattleStats = (token: Token): Token => {
  const multipliers = token.classMultipliers || { life: 1, mana: 1 };

  const maxLife = calculateMaxLife(
    token.attributes.consistencia,
    token.attributes.level,
    multipliers.life
  );
  const maxMana = calculateMaxMana(
    token.attributes.sabedoria,
    token.proficiencies.sabedoria,
    token.attributes.level,
    multipliers.mana
  );

  return {
    ...token,
    maxLife,
    currentLife: maxLife,
    maxMana,
    currentMana: maxMana,
  };
};
