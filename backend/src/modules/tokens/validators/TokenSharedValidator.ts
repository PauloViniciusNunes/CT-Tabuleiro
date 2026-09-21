import { z } from "zod";
import {
    ParalysisState,
    TokenStatus,
    TokenTeam,
    TokenType,
} from "@prisma/client";

const tokenClassValues = [
    "Guerreiro",
    "Mago",
    "Bárbaro",
    "Barbaro",
    "Ladino",
    "Feitiçeiro",
    "Feiticeiro",
] as const;

export const tokenClassSchema = z.enum(tokenClassValues).transform((value) => {
    if (value === "Bárbaro") {
        return "Barbaro";
    }

    if (value === "Feitiçeiro") {
        return "Feiticeiro";
    }

    return value;
});

export const attributesSchema = z.object({
    forca: z.number().int().optional(),
    destreza: z.number().int().optional(),
    consistencia: z.number().int().optional(),
    inteligencia: z.number().int().optional(),
    sabedoria: z.number().int().optional(),
    carisma: z.number().int().optional(),
    level: z.number().int().min(1).optional(),
    xp: z.number().int().min(0).optional(),
});

export const occasionalAdditionSchema = z.object({
    forca: z.number().int().optional(),
    destreza: z.number().int().optional(),
    consistencia: z.number().int().optional(),
    inteligencia: z.number().int().optional(),
    sabedoria: z.number().int().optional(),
    carisma: z.number().int().optional(),
});

export const proficienciesSchema = z.object({
    forca: z.boolean().optional(),
    destreza: z.boolean().optional(),
    consistencia: z.boolean().optional(),
    inteligencia: z.boolean().optional(),
    sabedoria: z.boolean().optional(),
    carisma: z.boolean().optional(),
});

export const positionSchema = z.object({
    col: z.number().int().min(0),
    row: z.number().int().min(0),
});

export const tokenTypeSchema = z.enum(TokenType);
export const tokenStatusSchema = z.enum(TokenStatus);
export const tokenTeamSchema = z.enum(TokenTeam);
export const paralysisStateSchema = z.enum(ParalysisState);
const mechanicListSchema = z.preprocess(
    (value) => typeof value === "string" ? [value] : value,
    z.array(z.string().min(1)).transform((values) => [...new Set(values)]),
);

export const tokenPrimaryElementSchema = mechanicListSchema;
export const tokenPrimaryDisvantageSchema = mechanicListSchema;
