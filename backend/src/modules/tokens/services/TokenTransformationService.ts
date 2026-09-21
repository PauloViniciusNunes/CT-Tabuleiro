import { Prisma, type Token } from "@prisma/client";

import { TokenRepository } from "../repositories/TokenRepository";
import { CreateTokenValidator } from "../validators/CreateTokenValidator";
import { UpdateTokenValidator } from "../validators/UpdateTokenValidator";

type CreateTokenInput = ReturnType<typeof CreateTokenValidator.parse>;
type UpdateTokenInput = ReturnType<typeof UpdateTokenValidator.parse>;

const ATTRIBUTE_KEYS = [
    "forca",
    "destreza",
    "consistencia",
    "inteligencia",
    "sabedoria",
    "carisma",
] as const;

type AttributeKey = typeof ATTRIBUTE_KEYS[number];
type AttributeMultipliers = Record<AttributeKey, number>;

export const DEFAULT_ATTRIBUTE_MULTIPLIERS: AttributeMultipliers = {
    forca: 1,
    destreza: 1,
    consistencia: 1,
    inteligencia: 1,
    sabedoria: 1,
    carisma: 1,
};

function multipliersFrom(value: unknown): AttributeMultipliers {
    const record = value && typeof value === "object"
        ? value as Record<string, unknown>
        : {};

    return ATTRIBUTE_KEYS.reduce<AttributeMultipliers>((result, attribute) => {
        const multiplier = record[attribute];
        result[attribute] = typeof multiplier === "number" &&
            Number.isFinite(multiplier) && multiplier >= 0
            ? multiplier
            : 1;
        return result;
    }, { ...DEFAULT_ATTRIBUTE_MULTIPLIERS });
}

function arrayFrom(value: unknown): unknown[] {
    return Array.isArray(value) ? [...value] : [];
}

function uniqueCards(...sources: unknown[]): Prisma.JsonArray {
    const cards = sources.flatMap(arrayFrom);
    const unique = new Map<string, unknown>();

    cards.forEach((card, index) => {
        const id = card && typeof card === "object" &&
            typeof (card as Record<string, unknown>).id === "string"
            ? (card as Record<string, unknown>).id as string
            : `anonymous-${index}-${JSON.stringify(card)}`;
        unique.set(id, card);
    });

    return [...unique.values()] as Prisma.JsonArray;
}

function uniqueTags(
    inherited: readonly string[],
    additional: readonly string[],
    emptyTag: string,
): string[] {
    const tags = [...new Set([...inherited, ...additional])];
    const meaningful = tags.filter((tag) => tag !== emptyTag);
    return meaningful.length > 0 ? meaningful : [emptyTag];
}

function effectiveTransformationFields(
    transformation: {
        inheritBaseCards?: boolean;
        attributeMultipliers?: unknown;
        additionalCards?: unknown;
        additionalMechanics?: readonly string[];
        additionalDisadvantages?: readonly string[];
    },
    base: Token,
) {
    const multipliers = multipliersFrom(transformation.attributeMultipliers);
    const cards = uniqueCards(
        transformation.inheritBaseCards === false ? [] : base.cards,
        transformation.additionalCards,
    );

    return {
        forca: Math.round(base.forca * multipliers.forca),
        destreza: Math.round(base.destreza * multipliers.destreza),
        consistencia: Math.round(base.consistencia * multipliers.consistencia),
        inteligencia: Math.round(base.inteligencia * multipliers.inteligencia),
        sabedoria: Math.round(base.sabedoria * multipliers.sabedoria),
        carisma: Math.round(base.carisma * multipliers.carisma),
        level: base.level,
        xp: base.xp,
        cards,
        tokenCards: cards,
        tokenPrimaryElement: uniqueTags(
            base.tokenPrimaryElement,
            transformation.additionalMechanics ?? [],
            "neutro",
        ),
        tokenPrimaryDisvantage: uniqueTags(
            base.tokenPrimaryDisvantage,
            transformation.additionalDisadvantages ?? [],
            "none",
        ),
    };
}

/**
 * Validates transformation relationships and resolves their effective values.
 * Multipliers/additions remain the source of truth; flat Token columns are a
 * compatibility snapshot for the rest of the engine.
 */
export class TokenTransformationService {
    constructor(private readonly repository = new TokenRepository()) {}

    async prepareCreate(input: CreateTokenInput): Promise<CreateTokenInput> {
        if (input.isTransformation !== true) {
            return {
                ...input,
                isTransformation: false,
                baseTokenId: null,
                inheritBaseCards: true,
                attributeMultipliers: { ...DEFAULT_ATTRIBUTE_MULTIPLIERS },
                additionalCards: [],
                additionalMechanics: [],
                additionalDisadvantages: [],
            };
        }

        const base = await this.requireResolvedBase(input.baseTokenId, input.campaignId);
        const multipliers = multipliersFrom(input.attributeMultipliers);
        const additionalCards = arrayFrom(input.additionalCards);
        const additionalMechanics = input.additionalMechanics ?? [];
        const additionalDisadvantages = input.additionalDisadvantages ?? [];

        return {
            ...input,
            isTransformation: true,
            baseTokenId: base.id,
            inheritBaseCards: input.inheritBaseCards ?? true,
            attributeMultipliers: multipliers,
            additionalCards,
            additionalMechanics,
            additionalDisadvantages,
            ...effectiveTransformationFields({
                inheritBaseCards: input.inheritBaseCards,
                attributeMultipliers: multipliers,
                additionalCards,
                additionalMechanics,
                additionalDisadvantages,
            }, base),
            inventoryDimensionsCols: base.inventoryDimensionsCols,
            inventoryDimensionsRows: base.inventoryDimensionsRows,
            primaryHandId: base.primaryHandId,
            offHandId: base.offHandId,
            neckId: base.neckId,
            ringId: base.ringId,
            armorId: base.armorId,
            commonSlotIds: [...base.commonSlotIds],
            economy: base.economy,
        };
    }

    async prepareUpdate(
        token: Token,
        input: UpdateTokenInput,
    ): Promise<UpdateTokenInput> {
        const isTransformation = input.isTransformation ?? token.isTransformation;

        if (!isTransformation) {
            return token.isTransformation || input.isTransformation === false
                ? {
                    ...input,
                    isTransformation: false,
                    baseTokenId: null,
                    inheritBaseCards: true,
                    attributeMultipliers: { ...DEFAULT_ATTRIBUTE_MULTIPLIERS },
                    additionalCards: [],
                    additionalMechanics: [],
                    additionalDisadvantages: [],
                }
                : input;
        }

        const baseTokenId = input.baseTokenId ?? token.baseTokenId;
        const campaignId = input.campaignId ?? token.campaignId;
        const base = await this.requireResolvedBase(baseTokenId, campaignId, token.id);
        const multipliers = multipliersFrom(input.attributeMultipliers ?? token.attributeMultipliers);
        const additionalCards = input.additionalCards ?? arrayFrom(token.additionalCards);
        const additionalMechanics = input.additionalMechanics ?? token.additionalMechanics;
        const additionalDisadvantages = input.additionalDisadvantages ?? token.additionalDisadvantages;
        const inheritBaseCards = input.inheritBaseCards ?? token.inheritBaseCards;

        return {
            ...input,
            isTransformation: true,
            baseTokenId: base.id,
            inheritBaseCards,
            attributeMultipliers: multipliers,
            additionalCards,
            additionalMechanics,
            additionalDisadvantages,
            ...effectiveTransformationFields({
                inheritBaseCards,
                attributeMultipliers: multipliers,
                additionalCards,
                additionalMechanics,
                additionalDisadvantages,
            }, base),
            inventoryDimensionsCols: base.inventoryDimensionsCols,
            inventoryDimensionsRows: base.inventoryDimensionsRows,
            primaryHandId: base.primaryHandId,
            offHandId: base.offHandId,
            neckId: base.neckId,
            ringId: base.ringId,
            armorId: base.armorId,
            commonSlotIds: [...base.commonSlotIds],
            economy: base.economy,
        };
    }

    async resolveOne(token: Token): Promise<Token> {
        const [resolved] = await this.resolveMany([token]);
        return resolved;
    }

    async resolveMany(tokens: readonly Token[]): Promise<Token[]> {
        const source = new Map(tokens.map((token) => [token.id, token]));
        const resolved = new Map<string, Token>();

        const visit = async (token: Token, path: ReadonlySet<string>): Promise<Token> => {
            const cached = resolved.get(token.id);
            if (cached) return cached;
            if (!token.isTransformation) {
                resolved.set(token.id, token);
                return token;
            }
            if (!token.baseTokenId) {
                throw new Error(`A transformação "${token.name}" não possui token base.`);
            }
            if (path.has(token.id)) {
                throw new Error("Foi detectado um ciclo entre transformações de token.");
            }

            let base = source.get(token.baseTokenId);
            if (!base) {
                base = await this.repository.findById(token.baseTokenId) ?? undefined;
                if (base) source.set(base.id, base);
            }
            if (!base) {
                throw new Error(`Token base da transformação "${token.name}" não foi encontrado.`);
            }

            const nextPath = new Set(path);
            nextPath.add(token.id);
            const resolvedBase = await visit(base, nextPath);
            const result: Token = {
                ...token,
                ...effectiveTransformationFields(token, resolvedBase),
            };
            resolved.set(token.id, result);
            return result;
        };

        return Promise.all(tokens.map((token) => visit(token, new Set())));
    }

    private async requireResolvedBase(
        baseTokenId: string | null | undefined,
        campaignId: string,
        transformingTokenId?: string,
    ): Promise<Token> {
        if (!baseTokenId) {
            throw new Error("Uma transformação deve possuir um token base.");
        }
        if (baseTokenId === transformingTokenId) {
            throw new Error("Um token não pode ser a própria base de transformação.");
        }

        const base = await this.repository.findById(baseTokenId);
        if (!base) {
            throw new Error("Token base da transformação não encontrado.");
        }
        if (base.campaignId !== campaignId) {
            throw new Error("Token base e transformação devem pertencer à mesma campanha.");
        }

        const resolved = await this.resolveOne(base);
        if (transformingTokenId) {
            let cursor: Token | null = base;
            const visited = new Set<string>();
            while (cursor?.isTransformation && cursor.baseTokenId) {
                if (cursor.baseTokenId === transformingTokenId) {
                    throw new Error("A alteração criaria um ciclo entre transformações de token.");
                }
                if (visited.has(cursor.id)) {
                    throw new Error("Foi detectado um ciclo entre transformações de token.");
                }
                visited.add(cursor.id);
                cursor = await this.repository.findById(cursor.baseTokenId);
            }
        }

        return resolved;
    }
}
