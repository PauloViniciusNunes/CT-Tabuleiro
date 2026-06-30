
import type { Token, TokenAttributes, TokenOccasionalAddition, TokenProficiencies, } from "../../types/token";

const defaultAttributes: TokenAttributes = {
    forca: 10,
    destreza: 10,
    consistencia: 10,
    inteligencia: 10,
    sabedoria: 10,
    carisma: 10,
    level: 1,
    xp: 0,
};

const defaultOccasionalAddition: TokenOccasionalAddition = {
    forca: 0,
    destreza: 0,
    consistencia: 0,
    inteligencia: 0,
    sabedoria: 0,
    carisma: 0,
};

const defaultProficiencies: TokenProficiencies = {
    forca: false,
    destreza: false,
    consistencia: false,
    inteligencia: false,
    sabedoria: false,
    carisma: false,
};

export function createToken(
    overrides: Partial<Token> = {}
): Token {

    return {
        createId: crypto.randomUUID(),
        id: crypto.randomUUID(),

        lastDamagerId: undefined,

        name: "Token",

        type: "player",

        imageUrl: "",

        class: "Guerreiro",

        tokenCards: [],
        cards: [],

        status: "Vivo",

        team: "Blue",

        bodytobodyRange: 1,
        magicalRange: 6,

        pendingXPAllocating: 0,

        currentLife: 20,
        maxLife: 20,

        currentMana: 10,
        maxMana: 10,

        certaintyDiceRemaining: 0,

        paralysisState: undefined,

        tokenEffects: [],

        tokenPrimaryElement: undefined,

        tokenPrimaryDisvantege: undefined,

        visualOverlays: [],

        bossSettings: undefined,

        ...overrides,

        attributes: {
            ...defaultAttributes,
            ...overrides.attributes,
        },

        ocassionalAddition: {
            ...defaultOccasionalAddition,
            ...overrides.ocassionalAddition,
        },

        proficiencies: {
            ...defaultProficiencies,
            ...overrides.proficiencies,
        },

        inventory: {
            inventoryDimensions: {
                rows: 5,
                cols: 5,
            },
            primaryHand: undefined,
            offHand: undefined,
            neck: undefined,
            ring: undefined,
            armor: undefined,
            commonSlot: [],
            economy: 0,
            ...overrides.inventory,
        },

        position: {
            row: 0,
            col: 0,
            ...overrides.position,
        },
    };
}