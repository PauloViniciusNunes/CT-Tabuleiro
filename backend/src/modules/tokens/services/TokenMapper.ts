import { Prisma, TokenStatus } from "@prisma/client";

import { CreateTokenValidator } from "../validators/CreateTokenValidator";
import { UpdateTokenValidator } from "../validators/UpdateTokenValidator";

type CreateTokenInput = ReturnType<typeof CreateTokenValidator.parse>;
type UpdateTokenInput = ReturnType<typeof UpdateTokenValidator.parse>;

function json(value: unknown, fallback: Prisma.InputJsonValue): Prisma.InputJsonValue {
    if (value === undefined) {
        return fallback;
    }

    return value as Prisma.InputJsonValue;
}

export function mapCreateTokenInput(
    input: CreateTokenInput,
    userId: string,
): Prisma.TokenUncheckedCreateInput {
    const id = input.id ?? crypto.randomUUID();
    const maxLife = input.maxLife ?? input.currentLife ?? 10;
    const maxMana = input.maxMana ?? input.currentMana ?? 0;

    return {
        id,
        lastDamagerId: input.lastDamagerId,
        name: input.name,
        type: input.type,
        imageUrl: input.imageUrl,
        isTransformation: input.isTransformation ?? false,
        baseTokenId: input.baseTokenId ?? null,
        inheritBaseCards: input.inheritBaseCards ?? true,
        attributeMultipliers: json(input.attributeMultipliers, {
            forca: 1,
            destreza: 1,
            consistencia: 1,
            inteligencia: 1,
            sabedoria: 1,
            carisma: 1,
        }),
        additionalCards: json(input.additionalCards, []),
        additionalMechanics: input.additionalMechanics ?? [],
        additionalDisadvantages: input.additionalDisadvantages ?? [],
        forca: input.forca ?? 25,
        destreza: input.destreza ?? 25,
        consistencia: input.consistencia ?? 25,
        inteligencia: input.inteligencia ?? 25,
        sabedoria: input.sabedoria ?? 25,
        carisma: input.carisma ?? 25,
        level: input.level ?? 2,
        xp: input.xp ?? 0,
        bonusForca: input.bonusForca ?? 0,
        bonusDestreza: input.bonusDestreza ?? 0,
        bonusConsistencia: input.bonusConsistencia ?? 0,
        bonusInteligencia: input.bonusInteligencia ?? 0,
        bonusSabedoria: input.bonusSabedoria ?? 0,
        bonusCarisma: input.bonusCarisma ?? 0,
        profForca: input.profForca ?? false,
        profDestreza: input.profDestreza ?? false,
        profConsistencia: input.profConsistencia ?? false,
        profInteligencia: input.profInteligencia ?? false,
        profSabedoria: input.profSabedoria ?? false,
        profCarisma: input.profCarisma ?? false,
        inventoryDimensionsCols: input.inventoryDimensionsCols ?? 5,
        inventoryDimensionsRows: input.inventoryDimensionsRows ?? 4,
        primaryHandId: input.primaryHandId ?? "",
        offHandId: input.offHandId ?? "",
        neckId: input.neckId ?? "",
        ringId: input.ringId ?? "",
        armorId: input.armorId ?? "",
        commonSlotIds: input.commonSlotIds ?? [],
        economy: input.economy ?? 0,
        class: input.class,
        tokenCards: json(input.tokenCards, []),
        cards: json(input.cards, []),
        status: input.status ?? TokenStatus.Vivo,
        team: input.team,
        col: input.position.col,
        row: input.position.row,
        startCol: input.startCol,
        startRow: input.startRow,
        bodyToBodyRange: input.bodyToBodyRange ?? 1,
        magicalRange: input.magicalRange ?? 6,
        naturalMovement: input.naturalMovement ?? 6,
        pendingXPAllocating: input.pendingXPAllocating ?? 0,
        currentLife: input.currentLife ?? maxLife,
        maxLife,
        currentMana: input.currentMana ?? maxMana,
        maxMana,
        certaintyDiceRemaining: input.certaintyDiceRemaining,
        paralysisState: input.paralysisState,
        tokenPrimaryElement: input.tokenPrimaryElement ?? [],
        tokenPrimaryDisvantage: input.tokenPrimaryDisvantage ?? input.tokenPrimaryDisvantege ?? [],
        tokenEffects: json(input.tokenEffects, []),
        visualOverlays: json(input.visualOverlays, []),
        bossSettings: input.bossSettings as Prisma.InputJsonValue | undefined,
        userId,
        campaignId: input.campaignId,
    };
}

export function mapUpdateTokenInput(
    input: UpdateTokenInput,
): Prisma.TokenUncheckedUpdateInput {
    const data: Prisma.TokenUncheckedUpdateInput = {};

    if (input.lastDamagerId !== undefined) data.lastDamagerId = input.lastDamagerId;
    if (input.name !== undefined) data.name = input.name;
    if (input.type !== undefined) data.type = input.type;
    if (input.imageUrl !== undefined) data.imageUrl = input.imageUrl;
    if (input.isTransformation !== undefined) data.isTransformation = input.isTransformation;
    if (input.baseTokenId !== undefined) data.baseTokenId = input.baseTokenId;
    if (input.inheritBaseCards !== undefined) data.inheritBaseCards = input.inheritBaseCards;
    if (input.attributeMultipliers !== undefined) {
        data.attributeMultipliers = input.attributeMultipliers as Prisma.InputJsonValue;
    }
    if (input.additionalCards !== undefined) {
        data.additionalCards = input.additionalCards as Prisma.InputJsonValue;
    }
    if (input.additionalMechanics !== undefined) data.additionalMechanics = input.additionalMechanics;
    if (input.additionalDisadvantages !== undefined) {
        data.additionalDisadvantages = input.additionalDisadvantages;
    }
    if (input.class !== undefined) data.class = input.class;
    if (input.status !== undefined) data.status = input.status;
    if (input.team !== undefined) data.team = input.team;
    if (input.inventoryDimensionsCols !== undefined) data.inventoryDimensionsCols = input.inventoryDimensionsCols;
    if (input.inventoryDimensionsRows !== undefined) data.inventoryDimensionsRows = input.inventoryDimensionsRows;
    if (input.primaryHandId !== undefined) data.primaryHandId = input.primaryHandId ?? "";
    if (input.offHandId !== undefined) data.offHandId = input.offHandId ?? "";
    if (input.neckId !== undefined) data.neckId = input.neckId ?? "";
    if (input.ringId !== undefined) data.ringId = input.ringId ?? "";
    if (input.armorId !== undefined) data.armorId = input.armorId ?? "";
    if (input.commonSlotIds !== undefined) data.commonSlotIds = input.commonSlotIds;
    if (input.economy !== undefined) data.economy = input.economy;


    if (input.forca !== undefined) data.forca = input.forca;
    if (input.destreza !== undefined) data.destreza = input.destreza;
    if (input.consistencia !== undefined) data.consistencia = input.consistencia;
    if (input.inteligencia !== undefined) data.inteligencia = input.inteligencia;
    if (input.sabedoria !== undefined) data.sabedoria = input.sabedoria;
    if (input.carisma !== undefined) data.carisma = input.carisma;
    if (input.level !== undefined) data.level = input.level;
    if (input.xp !== undefined) data.xp = input.xp;

    if (input.bonusForca !== undefined) data.bonusForca = input.bonusForca;
    if (input.bonusDestreza !== undefined) data.bonusDestreza = input.bonusDestreza;
    if (input.bonusConsistencia !== undefined) data.bonusConsistencia = input.bonusConsistencia;
    if (input.bonusInteligencia !== undefined) data.bonusInteligencia = input.bonusInteligencia;
    if (input.bonusSabedoria !== undefined) data.bonusSabedoria = input.bonusSabedoria;
    if (input.bonusCarisma !== undefined) data.bonusCarisma = input.bonusCarisma;

    if (input.profForca !== undefined) data.profForca = input.profForca;
    if (input.profDestreza !== undefined) data.profDestreza = input.profDestreza;
    if (input.profConsistencia !== undefined) data.profConsistencia = input.profConsistencia;
    if (input.profInteligencia !== undefined) data.profInteligencia = input.profInteligencia;
    if (input.profSabedoria !== undefined) data.profSabedoria = input.profSabedoria;
    if (input.profCarisma !== undefined) data.profCarisma = input.profCarisma;

    if (input.position !== undefined) {
        data.col = input.position.col;
        data.row = input.position.row;
    }

    if (input.startCol !== undefined) data.startCol = input.startCol;
    if (input.startRow !== undefined) data.startRow = input.startRow;

    if (input.bodyToBodyRange !== undefined) data.bodyToBodyRange = input.bodyToBodyRange;
    if (input.magicalRange !== undefined) data.magicalRange = input.magicalRange;
    if (input.naturalMovement !== undefined) data.naturalMovement = input.naturalMovement;
    if (input.pendingXPAllocating !== undefined) data.pendingXPAllocating = input.pendingXPAllocating;
    if (input.currentLife !== undefined) data.currentLife = input.currentLife;
    if (input.maxLife !== undefined) data.maxLife = input.maxLife;
    if (input.currentMana !== undefined) data.currentMana = input.currentMana;
    if (input.maxMana !== undefined) data.maxMana = input.maxMana;
    if (input.certaintyDiceRemaining !== undefined) data.certaintyDiceRemaining = input.certaintyDiceRemaining;
    if (input.paralysisState !== undefined) data.paralysisState = input.paralysisState;
    if (input.tokenPrimaryElement !== undefined) data.tokenPrimaryElement = input.tokenPrimaryElement;
    if (input.tokenPrimaryDisvantage !== undefined || input.tokenPrimaryDisvantege !== undefined) {
        data.tokenPrimaryDisvantage = input.tokenPrimaryDisvantage ?? input.tokenPrimaryDisvantege;
    }

    if (input.tokenCards !== undefined) data.tokenCards = input.tokenCards as Prisma.InputJsonValue;
    if (input.cards !== undefined) data.cards = input.cards as Prisma.InputJsonValue;
    if (input.tokenEffects !== undefined) data.tokenEffects = input.tokenEffects as Prisma.InputJsonValue;
    if (input.visualOverlays !== undefined) data.visualOverlays = input.visualOverlays as Prisma.InputJsonValue;
    if (input.bossSettings !== undefined) data.bossSettings = input.bossSettings as Prisma.InputJsonValue;

    return data;
}
