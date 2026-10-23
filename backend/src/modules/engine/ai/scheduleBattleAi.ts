/**
 * Keeps the engine independent from the concrete AI runner. The dynamic import
 * also breaks the syncBattleState -> AI -> service -> syncBattleState cycle.
 */
export function scheduleBattleAi(battleId: string | null | undefined): void {
    if (!battleId) return;

    void import("./BattleAiCoordinator")
        .then(({ BattleAiCoordinator }) => BattleAiCoordinator.schedule(battleId))
        .catch((error) => {
            console.error("[BATTLE AI] Não foi possível agendar a decisão.", error);
        });
}
