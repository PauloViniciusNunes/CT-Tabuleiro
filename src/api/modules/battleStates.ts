import type { BattleState } from "../../types/battle"
import { api } from "../client"
import { BattleStateMapper, JsonBattleStateMapper } from "../mappers/battleStateMapper"

import { useState, useEffect } from "react"

export class BattleStateAPI {

    static async getBattleState(mapId: string): Promise<BattleState> {
        const json = await api<any>(`/battles/states/map/${mapId}`)
        return BattleStateMapper(json)
    }

    static async createBattleState(battle: BattleState): Promise<BattleState> {
        const modifiedBattle = { ...battle }

        const json = JsonBattleStateMapper(modifiedBattle)

        return api<BattleState>("/battles/states/create", {
            method: "POST",
            body: JSON.stringify(json)
        })
    }

    static async deleteBattleState(id: string): Promise<unknown> {
        return api<unknown>(`/battles/state/${id}`, {
            method: "DELETE"
        })
    }

}

export function useBattleState(mapId: string) {
    const [battleState, setBattleState] = useState<BattleState>()

    useEffect(() => {
        if (!mapId) {
            setBattleState(undefined);
            return;
        }

        let cancelled = false;

        BattleStateAPI.getBattleState(mapId)
            .then((data) => {
                if (cancelled) return;
                console.info("API retornou Battle:", data);
                setBattleState(data);
            })
            .catch((err) => {
                if (cancelled) return;
                console.error("Erro ao buscar Battle:", err);
                setBattleState(undefined);
            });

        return () => {
            cancelled = true;
        };
    }, [mapId]);

    return battleState;
}
