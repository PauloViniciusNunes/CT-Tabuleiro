import { z } from "zod";

export const mapObjectTypeSchema = z.enum(["wall", "chest", "article", "door"]);

const mapObjectImageUrlSchema = z.string()
    .trim()
    .min(1, "Informe o link da imagem do objeto.")
    .max(2_048)
    .refine((value) => {
        try {
            const url = new URL(value);
            return url.protocol === "http:" || url.protocol === "https:";
        } catch {
            return false;
        }
    }, "Informe um link HTTP ou HTTPS válido para a imagem.");

export const CreateMapObjectValidator = z.object({
    type: mapObjectTypeSchema,
    row: z.number().int().min(1),
    col: z.number().int().min(1),
    imgUrl: mapObjectImageUrlSchema,
    itemRelativeId: z.string().min(1).nullable().optional(),
    linkedMapId: z.string().min(1).nullable().optional(),
});

export const UpdateMapObjectValidator = CreateMapObjectValidator.partial()
    .refine((value) => Object.keys(value).length > 0, {
        message: "Informe ao menos uma propriedade para atualizar.",
    });

export const CreateMapWallsValidator = z.object({
    walls: z.array(z.object({
        row: z.number().int().min(1),
        col: z.number().int().min(1),
        imgUrl: mapObjectImageUrlSchema,
    })).max(10_000),
});

export const PaintMapObjectsValidator = z.object({
    objects: z.array(CreateMapObjectValidator).min(1).max(500),
});

export const EraseMapObjectsValidator = z.object({
    positions: z.array(z.object({
        row: z.number().int().min(1),
        col: z.number().int().min(1),
    })).min(1).max(500),
});

export type CreateMapObjectInput = z.infer<typeof CreateMapObjectValidator>;
export type UpdateMapObjectInput = z.infer<typeof UpdateMapObjectValidator>;
