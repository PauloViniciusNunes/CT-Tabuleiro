import { Socket } from "socket.io-client";
import { SocketEvent } from "../socket/events";

import type { BattleState } from "../../types/battle";
import type { Dispatch, SetStateAction } from "react";
import { BattleStateMapper } from "../mappers/battleStateMapper";

export class BattleSocketListener {

    private readonly socket: Socket;
    private readonly setBattleState: Dispatch<SetStateAction<BattleState>>;

    constructor(
        socket: Socket,
        setBattleState: Dispatch<SetStateAction<BattleState>>
    ) {
        this.socket = socket
        this.setBattleState = setBattleState
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

    private onBattleStart = (createdBattle: any) => {
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

    private onBattleUpdated = (updatedBattle: any) => {
        const battle = BattleStateMapper(updatedBattle)
        this.setBattleState(battle)
    }

    private onBattleEnd = () => {
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
