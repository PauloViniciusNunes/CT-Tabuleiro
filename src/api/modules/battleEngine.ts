import { api } from "../client";
import type { OffensiveCardAttribute } from "../../types/card";
import type {
    SpecialResponseCommand,
    SpecialResponseValues,
} from "../../types/specialResponse";
import type { Target } from "../../types/target";

export type EquippedInventorySlot =
    | "primaryHand"
    | "offHand"
    | "neck"
    | "ring"
    | "armor";

export type SwapItemCommand =
    | {
        operation: "equip";
        tokenId: string;
        itemId: string;
        itemIndex: number;
    }
    | {
        operation: "unequip";
        tokenId: string;
        equippedSlot: EquippedInventorySlot;
    };

export type OffensiveCardResponseCommand = {
    battleId: string;
    defenderId: string;
    attribute: OffensiveCardAttribute;
    usedMana: number;
    usedActions: number;
    usedCertainDie: boolean;
    previewAction: boolean;
};

export type UseArtificeCommand = {
    battleId: string;
    tokenId: string;
    itemId: string;
    itemIndex: number;
    target?: Target;
};

export type MoveTokenCommand = {
    battleId: string;
    tokenId: string;
    to: {
        col: number;
        row: number;
    };
};

export type MoveTokenResolution = {
    tokenId: string;
    from: { col: number; row: number };
    to: { col: number; row: number };
    cancelled: boolean;
};

export class BattleEngineAPI {
    static async startBattle(mapId: string) {
        await api<any>(`/battles/engine/${mapId}`, {
            method: "GET"
        })
    }

    static async executeAction(choice: any) {
        await api<any>('/battles/engine/execute', {
            method: "POST",
            body: JSON.stringify(choice)
        })
    }

    static async reaction(choice: any) {
        await api<any>('/battles/engine/reaction', {
            method: "POST",
            body: JSON.stringify(choice)
        })
    }

    static async end(battleId: any) {
        await api<any>(`/battles/engine/end`, {
            method: "POST",
            body: JSON.stringify(battleId)
        })
    }

    static async next(battleId: any) {

        const battle = {
            battleId: battleId
        }

        await api<any>(`/battles/engine/next`, {
            method: "POST",
            body: JSON.stringify(battle)
        })
    }

    static async response(choice: any) {
        await api<any>(`/battles/engine/response`, {
            method: "POST",
            body: JSON.stringify(choice)
        })
    }

    static async defense(choice: any) {
        await api<any>(`/battles/engine/defense`, {
            method: "POST",
            body: JSON.stringify(choice)
        })
    }

    static async prev(battleId: string) {
        await api<any>(`/battles/engine/prev`, {
            method: "POST",
            body: JSON.stringify({battleId: battleId})
        })
    }    

    static async card(choice: any) {
        await api<any>(`/battles/engine/card`, {
            method: "POST",
            body: JSON.stringify(choice)
        })
    }

    static async cancelReaction(battleId: string) {
        const choice = {
            battleId: battleId
        }

        await api<any>(`/battles/engine/cancelReaction`, {
            method: "POST",
            body: JSON.stringify(choice)
        })
    }

    static async pivot(payload: any) {
        await api<any>(`/battles/engine/pivot`, {
            method: "POST",
            body: JSON.stringify(payload)
        })
    }

    static async confirmPivot(payload: any) {
        await api<any>(`/battles/engine/confirmPivot`, {
            method: "POST",
            body: JSON.stringify(payload)
        })
    }

    static async swapItem(command: SwapItemCommand) {
        return api<any>(`/battles/engine/swap`, {
            method: "POST",
            body: JSON.stringify(command),
        });
    }

    static async consumeArtifice(command: UseArtificeCommand) {
        return api<any>(`/battles/engine/use-artifice`, {
            method: "POST",
            body: JSON.stringify(command),
        });
    }

    /** Uses the engine boundary so board movement emits TOKEN_MOVED. */
    static async moveToken(command: MoveTokenCommand) {
        return api<MoveTokenResolution>(`/battles/engine/move`, {
            method: "POST",
            body: JSON.stringify(command),
        });
    }

    static async offensiveCardResponse(command: OffensiveCardResponseCommand) {
        return api<unknown>(`/battles/engine/offensive-card-response`, {
            method: "POST",
            body: JSON.stringify(command),
        });
    }

    static async resolveSpecialResponse(
        battleId: string,
        requestId: string,
        action: "submit" | "cancel",
        values: SpecialResponseValues = {},
    ) {
        const command: SpecialResponseCommand = {
            battleId,
            requestId,
            action,
            values,
        };
        return api<{ action: "submit" | "cancel"; values: SpecialResponseValues }>(
            "/battles/engine/special-response",
            {
                method: "POST",
                body: JSON.stringify(command),
            },
        );
    }
}
