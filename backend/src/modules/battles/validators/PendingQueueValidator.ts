import { z } from "zod";
import { Prisma } from "@prisma/client";

// Helper para validar/tipar campos do tipo JSON do Prisma
const jsonSchema = z.custom<Prisma.InputJsonValue>().optional();

export const PendingQueueValidator = z.object({
  id: z.string().uuid().optional(),
  pendingAttack: jsonSchema,
  pendingReaction: jsonSchema,
  pendingCardResolution: jsonSchema,
  pendingFreeResponse: jsonSchema,
  pendingEsquivaRoll: jsonSchema,
});

export type PendingQueueInput = z.infer<typeof PendingQueueValidator>;