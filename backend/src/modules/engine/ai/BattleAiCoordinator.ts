import { BattleAiService } from "./BattleAiService";

const DECISION_DELAY_MS = 250;

/**
 * Serializes autonomous decisions per battle. Every state synchronization that
 * happens while the bot is working requests one more pass, so chained forms are
 * answered without recursion and without locking the request that created them.
 */
export class BattleAiCoordinator {
    private static readonly activeBattles = new Set<string>();
    private static readonly scheduledBattles = new Set<string>();
    private static readonly rerunBattles = new Set<string>();

    static schedule(battleId: string): void {
        if (!battleId) return;
        if (this.activeBattles.has(battleId)) {
            this.rerunBattles.add(battleId);
            return;
        }
        if (this.scheduledBattles.has(battleId)) return;

        this.scheduledBattles.add(battleId);
        setTimeout(() => void this.run(battleId), DECISION_DELAY_MS);
    }

    private static async run(battleId: string): Promise<void> {
        this.scheduledBattles.delete(battleId);
        if (this.activeBattles.has(battleId)) {
            this.rerunBattles.add(battleId);
            return;
        }

        this.activeBattles.add(battleId);
        const service = new BattleAiService();
        try {
            await service.executeOne(battleId);
        } catch (error) {
            await service.recover(battleId, error).catch((recoveryError) => {
                console.error("[BATTLE AI] O fallback também falhou.", recoveryError);
            });
        } finally {
            this.activeBattles.delete(battleId);
            if (this.rerunBattles.delete(battleId)) this.schedule(battleId);
        }
    }
}
