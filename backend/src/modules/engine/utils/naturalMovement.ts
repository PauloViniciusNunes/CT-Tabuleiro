export function assertNaturalMovement(
    from: { col: number; row: number },
    to: { col: number; row: number },
    limit: number,
): void {
    const distance = Math.max(Math.abs(to.col - from.col), Math.abs(to.row - from.row));
    if (!Number.isInteger(limit) || limit < 0 || distance > limit) {
        throw new Error("O movimento excede o deslocamento natural do token.");
    }
}
