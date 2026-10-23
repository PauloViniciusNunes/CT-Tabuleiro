export type RandomSource = () => number;

export function randomInteger(
    min: number,
    max: number,
    random: RandomSource = Math.random,
): number {
    const lower = Math.ceil(Math.min(min, max));
    const upper = Math.floor(Math.max(min, max));
    return lower + Math.floor(random() * (upper - lower + 1));
}

export function randomChoice<T>(
    values: readonly T[],
    random: RandomSource = Math.random,
): T | null {
    if (values.length === 0) return null;
    return values[Math.min(values.length - 1, Math.floor(random() * values.length))] ?? null;
}

export function chance(
    probability: number,
    random: RandomSource = Math.random,
): boolean {
    return random() < Math.max(0, Math.min(1, probability));
}
