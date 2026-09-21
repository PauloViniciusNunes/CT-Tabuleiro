import { z } from "zod";

// ===== VALIDADORES AUXILIARES PARA OS CAMPOS JSON =====

export const InitiativeDataSchema = z.object({
  tokenId: z.string(),
  initiative: z.number(),
  hasExtraTurn: z.boolean(),
});

export const BattleLocksSchema = z.object({
  reallocating: z.boolean(),
  resolvingAction: z.boolean(),
});

export const RollResultSchema = z.object({
  rawRolls: z.array(z.number()),
  total: z.number(),
  usedMana: z.number(),
  CRI: z.number(),
});

export const ActionChoiceSchema = z.object({
  attribute: z.enum(["forca", "destreza", "consistencia", "inteligencia", "sabedoria", "carisma"]).optional(),
  type: z.string(),
  attackerId: z.string().optional(),
  targetId: z.string().optional(),
  round: z.number().optional(),
  rollResult: RollResultSchema.optional(),
});

export const TurnEffectSchema = z.object({
  type: z.string(),
  intensity: z.number(),
  duration: z.number(),
  appliedAtRound: z.number(),
  moment: z.enum(["OwnTurn", "AnyTurn"]),
});

const recordOrEmptyObject = <T extends z.ZodTypeAny>(valueType: T) =>
  z.preprocess(
    (val) => (Array.isArray(val) ? {} : val ?? {}),
    z.record(z.string(), valueType)
  );

// ===== VALIDADOR PRINCIPAL DO BATTLESTATE =====

export const BattleStateValidator = z.object({
  id: z.string().optional(),
  mapId: z.string(),
  status: z.enum(["Not in Battle", "In Battle"]),
  round: z.number().int().nonnegative(),
  currentTurnIndex: z.number().int().nonnegative(),
  currentActorId: z.string().nullable(),
  currentActorUserId: z.string(),
  phase: z.string(),
  isReallocatingTurns: z.boolean(),
  turnVersion: z.number().int().nonnegative(),
  
  // Objetos e Record Maps (Armazenados como Json no Prisma)
  locks: BattleLocksSchema,
  turnOrder: z.array(InitiativeDataSchema),
  accumulatedActions: z.record(z.string(), z.number().int()),
  activeEffects: z.record(z.string(), z.array(TurnEffectSchema)),
  actionHistory: z.array(ActionChoiceSchema),
  tokensBattlePosition: recordOrEmptyObject(z.number()).optional(),
  didActThisTurn: recordOrEmptyObject(z.boolean()).optional(),

  // Chave do Relacionamento 1-para-1 com PendingQueue
  pendingQueueId: z.string(),
});
