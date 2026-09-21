import { z } from "zod";
import {
    paralysisStateSchema,
    tokenClassSchema,
    tokenPrimaryDisvantageSchema,
    tokenPrimaryElementSchema,
    tokenStatusSchema,
    tokenTeamSchema,
    tokenTypeSchema,
} from "./TokenSharedValidator";

const attributeMultipliersSchema = z.object({
    forca: z.number().finite().nonnegative(),
    destreza: z.number().finite().nonnegative(),
    consistencia: z.number().finite().nonnegative(),
    inteligencia: z.number().finite().nonnegative(),
    sabedoria: z.number().finite().nonnegative(),
    carisma: z.number().finite().nonnegative(),
});

export const CreateTokenValidator = z.object({
    id: z.string().optional(),
    lastDamagerId: z.string().optional().nullable(),
    name: z.string().min(1).max(120),
    type: tokenTypeSchema,
    imageUrl: z.string(),

    // ===== TRANSFORMAÇÃO =====
    isTransformation: z.boolean().optional(),
    baseTokenId: z.string().min(1).optional().nullable(),
    inheritBaseCards: z.boolean().optional(),
    attributeMultipliers: attributeMultipliersSchema.optional(),
    additionalCards: z.array(z.unknown()).optional(),
    additionalMechanics: tokenPrimaryElementSchema.optional(),
    additionalDisadvantages: tokenPrimaryDisvantageSchema.optional(),
    
    // ===== ATRIBUTOS PLANOS (Como o Front realmente envia) =====
    forca: z.number().int().optional(),
    destreza: z.number().int().optional(),
    consistencia: z.number().int().optional(),
    inteligencia: z.number().int().optional(),
    sabedoria: z.number().int().optional(),
    carisma: z.number().int().optional(),
    level: z.number().int().optional(),
    xp: z.number().int().optional(),

    // ===== BÔNUS OCASIONAIS PLANOS =====
    bonusForca: z.number().int().optional(),
    bonusDestreza: z.number().int().optional(),
    bonusConsistencia: z.number().int().optional(),
    bonusInteligencia: z.number().int().optional(),
    bonusSabedoria: z.number().int().optional(),
    bonusCarisma: z.number().int().optional(),

    // ===== PROFICIÊNCIAS PLANAS =====
    profForca: z.boolean().optional(),
    profDestreza: z.boolean().optional(),
    profConsistencia: z.boolean().optional(),
    profInteligencia: z.boolean().optional(),
    profSabedoria: z.boolean().optional(),
    profCarisma: z.boolean().optional(),

    // ===== INVENTÁRIO E DIMENSÕES =====
    inventoryDimensionsCols: z.number().int().min(0).optional(),
    inventoryDimensionsRows: z.number().int().min(0).optional(),
    primaryHandId: z.string().optional().nullable(), 
    offHandId: z.string().optional().nullable(),  
    neckId: z.string().optional().nullable(),  
    ringId: z.string().optional().nullable(),  
    armorId: z.string().optional().nullable(),  
    commonSlotIds: z.array(z.string()).optional(), // ✅ Tipado corretamente como array de strings
    economy: z.number().int().min(0).optional(),   

    class: tokenClassSchema,
    status: tokenStatusSchema.optional(),
    team: tokenTeamSchema,
    
    // ===== POSIÇÃO PLANA =====
    position: z.object({
        col: z.number().int(),
        row: z.number().int(),
    }),
    startCol: z.number().int().optional().nullable(), // ✅ Alinhado com o payload plano
    startRow: z.number().int().optional().nullable(), // ✅ Alinhado com o payload plano

    // ===== COMBATE E OUTROS =====
    bodyToBodyRange: z.number().int().min(0).optional(),
    magicalRange: z.number().int().min(0).optional(),
    naturalMovement: z.number().int().min(0).optional(),
    pendingXPAllocating: z.number().int().min(0).optional(),
    currentLife: z.number().int().optional(),
    maxLife: z.number().int().optional(),
    currentMana: z.number().int().optional(),
    maxMana: z.number().int().optional(),
    certaintyDiceRemaining: z.number().int().min(0).optional().nullable(),
    paralysisState: paralysisStateSchema.optional(),
    
    // ===== RELAÇÕES / JSON =====
    tokenCards: z.unknown().optional(),
    cards: z.unknown().optional(),
    tokenEffects: z.array(z.unknown()).optional(),
    tokenPrimaryElement: tokenPrimaryElementSchema.optional(),
    tokenPrimaryDisvantage: tokenPrimaryDisvantageSchema.optional(),
    tokenPrimaryDisvantege: tokenPrimaryDisvantageSchema.optional(),
    visualOverlays: z.array(z.unknown()).optional(),
    bossSettings: z.unknown().optional().nullable(),
    userId: z.string(),
    campaignId: z.string(),
});
