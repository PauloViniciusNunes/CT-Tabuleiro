import type { EngineContext } from "../types/BoardEngineContext";

export function defineRemainingPrevisionAttacks(context: EngineContext, defenderId: string, attackerId: string, numbersActions: number) {
    const formatedKey = `${defenderId}->${attackerId}`;

    const current = context.remainingPrevisionAttacks.current[formatedKey] ?? 0;

    context.remainingPrevisionAttacks.current[formatedKey] = Math.min(5, current + numbersActions);
}

export function formatPrevisionAttackKey(defenderId: string, attackerId: string) {
    return `${defenderId}->${attackerId}`;
}