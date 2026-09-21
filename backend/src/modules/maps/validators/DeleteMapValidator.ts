import { cuid, z } from "zod"

export const DeleteMapValidator = z.object({
    id: z
        .string()
        
});