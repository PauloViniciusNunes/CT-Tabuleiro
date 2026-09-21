export type PendingReaction = {
    type: "consistencia" | "destreza";
    targetToken: any;
};

export type PendingAttack =
    {
        attackerId: string;
        targetId: string;
        rawDamage: number;
        attackRoll: number;
        usedMana: number;
        attackAttribute: string;
        pendingReactions: PendingReaction[];
        isReactionAllowed: boolean;
        isFreeAttack?: boolean;
        usedActions: number;
        atackElement: string;
        usedItem?: any;
    }

export type PendingOffensiveCard = {
    resolutionId: string;
    attackerId: string;
    cardId: string;
    rawCardResult: number;
    rawTestResult: number;
}

    export type Position = {
    row: number,
    col: number,
}

export type PivotCandidate =
    | { type: "cell"; position: Position }
    | { type: "token"; tokenId: string }
    | { type: "trigger" };    
