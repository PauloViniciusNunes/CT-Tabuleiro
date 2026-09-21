const ELEMENT_ALIASES: Readonly<Record<string, string>> = {
    fire: "fogo",
    water: "agua",
    "água": "agua",
    earth: "terra",
    air: "vento",
};

export interface TokenElementProfile {
    readonly id: string;
    readonly elements: readonly string[];
    readonly disadvantages: readonly string[];
}

interface TokenElementSource {
    readonly id: string;
    readonly tokenPrimaryElement: readonly string[] | string | null | undefined;
    readonly tokenPrimaryDisvantage: readonly string[] | string | null | undefined;
}

export function normalizeElement(element: string): string {
    const normalized = element.trim().toLocaleLowerCase("pt-BR");
    return ELEMENT_ALIASES[normalized] ?? normalized;
}

function normalizeElements(
    value: readonly string[] | string | null | undefined,
): string[] {
    const values = Array.isArray(value)
        ? value
        : typeof value === "string"
            ? [value]
            : [];

    return [...new Set(values.filter(Boolean).map(normalizeElement))];
}

export function createTokenElementProfile(
    token: TokenElementSource,
): TokenElementProfile {
    return {
        id: token.id,
        elements: normalizeElements(token.tokenPrimaryElement),
        disadvantages: normalizeElements(token.tokenPrimaryDisvantage),
    };
}

export function profileHasElement(
    profile: TokenElementProfile | undefined,
    element: string,
): boolean {
    return profile?.elements.includes(normalizeElement(element)) ?? false;
}

export function profileHasDisadvantage(
    profile: TokenElementProfile | undefined,
    element: string,
): boolean {
    return profile?.disadvantages.includes(normalizeElement(element)) ?? false;
}
