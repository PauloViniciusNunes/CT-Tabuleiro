// CreateTokenTemplateValidator.ts

import { z } from "zod";

export const CreateTokenTemplateValidator = z.object({
    tokenId: z.string(),
    mapId: z.string(),
    col: z.number().int(),
    row: z.number().int()
});