type TokenMechanicSource = {
    tokenPrimaryElement: readonly string[] | string | null | undefined;
};

type TokenMechanicDisadvantageSource = {
    tokenPrimaryDisvantage: readonly string[] | string | null | undefined;
};

function normalizeMechanicList(
    value: readonly string[] | string | null | undefined,
): string[] {
    const values = Array.isArray(value)
        ? value
        : typeof value === "string"
            ? [value]
            : [];

    return [...new Set(values.filter(Boolean))];
}

export function resolveTokenMechanic(
    token: TokenMechanicSource,
    usedMana: number,
    selectedMechanic: unknown,
): string {
    if (usedMana <= 0) return "neutro";

    const mechanics = normalizeMechanicList(token.tokenPrimaryElement);
    if (mechanics.length === 0) return "neutro";
    if (mechanics.length === 1) return mechanics[0];

    if (typeof selectedMechanic !== "string" || !mechanics.includes(selectedMechanic)) {
        throw new Error("Selecione uma mecânica disponível para este token.");
    }

    return selectedMechanic;
}

export function hasTokenMechanicDisadvantage(
    token: TokenMechanicDisadvantageSource,
    mechanic: string,
): boolean {
    return normalizeMechanicList(token.tokenPrimaryDisvantage).includes(mechanic);
}
