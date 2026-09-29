import type { BattleState } from "../../types/battle";
import type { Campaign } from "../../types/campaign";

export class BattleViewRules {

    static showTokenResponseForm(
        campaign: Campaign | null,
        userId: string | null,
        tokenOwnerId: string | null | undefined,
    ): boolean {
        if (!campaign || !userId) {
            return false
        }

        return userId === tokenOwnerId
    }

    static showTransformationForm(
        campaign: Campaign | null,
        userId: string | null,
        tokenOwnerId: string | null | undefined,
    ): boolean {
        if (!campaign || !userId || !tokenOwnerId) return false;
        return userId === tokenOwnerId || userId === campaign.ownerId;
    }

    static showForm(campaign: Campaign | null, battleState: BattleState, userId: string | null): boolean {

        if(!campaign) {
            return false
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
