import {
    ParalysisState,
    TokenClass,
    TokenStatus,
    TokenTeam,
    TokenType,
} from "@prisma/client";

export interface CreateTokenDTO {
    createId?: string;
    templateId?: string;
    lastDamagerId?: string;
    name: string;
    type: TokenType;
    imageUrl: string;
    isTransformation?: boolean;
    baseTokenId?: string | null;
    inheritBaseCards?: boolean;
    attributeMultipliers?: Record<"forca" | "destreza" | "consistencia" | "inteligencia" | "sabedoria" | "carisma", number>;
    additionalCards?: unknown[];
    additionalMechanics?: string[];
    additionalDisadvantages?: string[];
    attributes?: {
        forca?: number;
        destreza?: number;
        consistencia?: number;
        inteligencia?: number;
        sabedoria?: number;
        carisma?: number;
        level?: number;
        xp?: number;
    };
    ocassionalAddition?: {
        forca?: number;
        destreza?: number;
        consistencia?: number;
        inteligencia?: number;
        sabedoria?: number;
        carisma?: number;
    };
    proficiencies?: {
        forca?: boolean;
        destreza?: boolean;
        consistencia?: boolean;
        inteligencia?: boolean;
        sabedoria?: boolean;
        carisma?: boolean;
    };
    class: TokenClass;
    tokenCards?: unknown;
    cards?: unknown;
    inventory?: unknown;
    status?: TokenStatus;
    team: TokenTeam;
    position: {
        col: number;
        row: number;
    };
    bodytobodyRange?: number;
    bodyToBodyRange?: number;
    magicalRange?: number;
    naturalMovement?: number;
    pendingXPAllocating?: number;
    currentLife?: number;
    maxLife?: number;
    currentMana?: number;
    maxMana?: number;
    startPosition?: {
        col: number;
        row: number;
    };
    certaintyDiceRemaining?: number;
    paralysisState?: ParalysisState;
    tokenEffects?: unknown;
    tokenPrimaryElement?: string[];
    tokenPrimaryDisvantege?: string[];
    tokenPrimaryDisvantage?: string[];
    visualOverlays?: unknown;
    bossSettings?: unknown;
    mapId: string;
}
