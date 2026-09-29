import { Prisma } from "@prisma/client";

/**
 * Token updates can change relations (base token and owner), so use Prisma's
 * checked input rather than mixing scalar foreign keys with nested relations.
 */
export type UpdateTokenDAO = Prisma.TokenUpdateInput;
