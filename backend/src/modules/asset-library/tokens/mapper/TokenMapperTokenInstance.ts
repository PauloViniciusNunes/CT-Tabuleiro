import { Prisma } from "@prisma/client";
import { Token } from "@prisma/client";

export function TokenMapperTokenInstance(
    token: Token , 
    mapId: string,
    col: number,
    row: number,
): Prisma.TokenInstanceCreateInput {

    return {
        templateTokenId: token.id,
        isTransformation: token.isTransformation,
        baseTokenId: token.baseTokenId,
        inheritBaseCards: token.inheritBaseCards,
        attributeMultipliers: token.attributeMultipliers as Prisma.InputJsonValue,
        additionalCards: token.additionalCards as Prisma.InputJsonValue,
        additionalMechanics: token.additionalMechanics,
        additionalDisadvantages: token.additionalDisadvantages,
        name: token.name,
        type: token.type,
        imageUrl: token.imageUrl,
        class: token.class,
        team: token.team,
        col: col,
        row: row,
        currentLife: token.currentLife,
        maxLife: token.maxLife,
        currentMana: token.currentMana,
        maxMana: token.maxMana,

        // ===== Valores Opcionais / Nullables =====
        lastDamagerId: token.lastDamagerId,
        startCol: token.startCol,
        startRow: token.startRow,
        certaintyDiceRemaining: token.certaintyDiceRemaining,
        paralysisState: token.paralysisState,
        tokenPrimaryElement: token.tokenPrimaryElement,
        tokenPrimaryDisvantage: token.tokenPrimaryDisvantage,

        // ===== Atributos com Valores Default =====
        forca: token.forca,
        destreza: token.destreza,
        consistencia: token.consistencia,
        inteligencia: token.inteligencia,
        sabedoria: token.sabedoria,
        carisma: token.carisma,
        level: token.level,
        xp: token.xp,

        // ===== Bônus Ocasionais =====
        bonusForca: token.bonusForca,
        bonusDestreza: token.bonusDestreza,
        bonusConsistencia: token.bonusConsistencia,
        bonusInteligencia: token.bonusInteligencia,
        bonusSabedoria: token.bonusSabedoria,
        bonusCarisma: token.bonusCarisma,

        // ===== Proficiências =====
        profForca: token.profForca,
        profDestreza: token.profDestreza,
        profConsistencia: token.profConsistencia,
        profInteligencia: token.profInteligencia,
        profSabedoria: token.profSabedoria,
        profCarisma: token.profCarisma,

        // ===== Estado de Combate e Status =====
        status: token.status,
        bodyToBodyRange: token.bodyToBodyRange,
        magicalRange: token.magicalRange,
        naturalMovement: token.naturalMovement,
        pendingXPAllocating: token.pendingXPAllocating,

        // ===== Campos de Texto estruturado em JSON =====


        // ===== Relações Base Obrigatórias =====
        user: {
            connect: {
                id: token.userId
            }
        },
        map: {
            connect: {
                id: mapId
            }
        },
        primaryHandId: token.primaryHandId,
        offHandId: token.offHandId,
        ringId: token.ringId,
        neckId: token.neckId,
        armorId: token.armorId,
        commonSlotIds: token.commonSlotIds,
        inventoryDimensionsCols: token.inventoryDimensionsCols,
        inventoryDimensionsRows: token.inventoryDimensionsRows,
        economy: token.economy,
        // ===== Campos solicitados para ficarem vazios =====
        // tokenCards e inventory foram omitidos para não criar vínculos na tabela pivot de instâncias
        tokenCards: token.tokenCards ?? [],
        cards: token.cards ?? []
    };

}
