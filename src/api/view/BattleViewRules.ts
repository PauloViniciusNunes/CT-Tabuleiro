import type { BattleState } from "../../types/battle";
import type { Campaign } from "../../types/campaign";

export class BattleViewRules {

    static showForm(campaign: Campaign | null, battleState: BattleState, userId: string | null): boolean {

        if(!campaign) {
            return false
        }

        if(userId === campaign.ownerId) {
            return true
        }

        if(!userId) {
            return false
        }

        if(!battleState.currentActorUserId || battleState.currentActorUserId === "") {
            return false
        }

        if(battleState.status === "In Battle" &&
            battleState.currentActorUserId === userId
        ) {
            return true
        }
        else {
            return false
        }
    }

}
