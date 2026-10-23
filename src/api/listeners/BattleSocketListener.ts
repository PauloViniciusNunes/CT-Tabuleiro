import { Socket } from "socket.io-client";
import { SocketEvent } from "../socket/events";

import type { BattleState } from "../../types/battle";
import type { Dispatch, SetStateAction } from "react";
import { BattleStateMapper } from "../mappers/battleStateMapper";

export interface BattleEndedPayload {
    id: string;
    mapId: string;
    winnerTeam: string | null;
    winnerTokenIds: string[];
}

export class BattleSocketListener {

    private readonly socket: Socket;
    private readonly setBattleState: Dispatch<SetStateAction<BattleState>>;
    private readonly handleBattleEnded?: (payload: BattleEndedPayload) => void;

    constructor(
        socket: Socket,
        setBattleState: Dispatch<SetStateAction<BattleState>>,
        handleBattleEnded?: (payload: BattleEndedPayload) => void,
    ) {
        this.socket = socket
        this.setBattleState = setBattleState
        this.handleBattleEnded = handleBattleEnded
    }

    register() {
        this.socket.on(SocketEvent.BATTLE_STARTED, this.onBattleStart)
        this.socket.on(SocketEvent.BATTLE_UPDATED, this.onBattleUpdated)
        this.socket.on(SocketEvent.BATTLE_ENDED, this.onBattleEnd)
    }

    unregister() {
        this.socket.off(SocketEvent.BATTLE_STARTED, this.onBattleStart)
        this.socket.off(SocketEvent.BATTLE_UPDATED, this.onBattleUpdated)
        this.socket.off(SocketEvent.BATTLE_ENDED, this.onBattleEnd)
    }

    private onBattleStart = (createdBattle: unknown) => {
        try {
            const battle = BattleStateMapper(createdBattle)
            console.info("BATALHA MAPEADA:", battle) // Se não chegar aqui, o erro está na linha de cima
            this.setBattleState(battle)
        } catch (error) {
            // 🟢 EXIBA O ERRO ORIGINAL NO CONSOLE
            console.error("ERRO REAL NO MAPPER DE BATALHA:", error)
            throw new Error("A batalha não pode iniciar, houve um erro.")
        }
    }

    private onBattleUpdated = (updatedBattle: unknown) => {
        const battle = BattleStateMapper(updatedBattle)
        this.setBattleState(battle)
    }

    private onBattleEnd = (rawPayload: unknown) => {
        if (rawPayload && typeof rawPayload === "object") {
            const payload = rawPayload as Partial<BattleEndedPayload>;
            if (typeof payload.id === "string" && typeof payload.mapId === "string") {
                this.handleBattleEnded?.({
                    id: payload.id,
                    mapId: payload.mapId,
                    winnerTeam: typeof payload.winnerTeam === "string"
                        ? payload.winnerTeam
                        : null,
                    winnerTokenIds: Array.isArray(payload.winnerTokenIds)
                        ? payload.winnerTokenIds.filter(
                            (tokenId): tokenId is string => typeof tokenId === "string",
                        )
                        : [],
                });
            }
        }

        this.setBattleState({
            id: "",
            status: "Not in Battle",
            round: 0,
            turnOrder: [],
            currentTurnIndex: 0,
            currentActorId: null,
            currentActorUserId: "",
            phase: "Initiative",
            locks: {
                reallocating: false,
                resolvingAction: false
            },
            accumulatedActions: {},
            activeEffects: {},
            actionHistory: [],
            isReallocatingTurns: false,
            turnVersion: 0,
            tokensBattlePosition: {},
            previsionActions: {},
            mapId: "",
            cardsNotRechargeds: {},
            timeToRechargeCard: {},
            tokensInOffensiveCard: [],
            maxSelectablePivots: 0,
            remainingPivots: 0,
            mechanicEntitiesInstances: []
        })
    }
}
