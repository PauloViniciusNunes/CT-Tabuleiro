import { Socket } from "socket.io-client";
import { SocketEvent } from "../../../backend/src/runtime/Events";
import type { Dispatch, SetStateAction } from "react";
import { PendingAttackMapper } from "../mappers/pendingMappers";
import { PendingEsquivaRollMapper } from "../mappers/pendingMappers";
import { PendingFreeResponseMapper } from "../mappers/pendingMappers";
import type { PendingAttack } from "../../types/battle";
import type { RollResult } from "../../types/battle";
import type { Token } from "../../types/token";
import { TokenInstaceMapper } from "../mappers/tokenInstanceMapper";
import type { Card } from "../../types/card";
import { CardMapper } from "../mappers/cardMapper";
import type { PendingSpecialResponse } from "../../types/specialResponse";

export class PendingSocketListener {

    private readonly socket: Socket;
    private readonly setPendingAttack: Dispatch<SetStateAction<PendingAttack | null>>
    private readonly setEsquivaRoll: Dispatch<SetStateAction<RollResult | null>>
    private readonly setPendingFreeResponse: Dispatch<SetStateAction<{ responderId: string, paralyzedId: string } | null>>
    private readonly setPendingCardResolution: Dispatch<SetStateAction<Token | null>>
    private readonly setPendingOffensiveCard: Dispatch<SetStateAction<Card | undefined>>
    private readonly setOffensiveCardAttackerId: Dispatch<SetStateAction<string | null>>
    private readonly setPendingSpecialResponse: Dispatch<SetStateAction<PendingSpecialResponse | null>>
    private readonly getCurrentMapId: () => string | undefined

    constructor(
        socket: Socket,
        setPendingAttack: Dispatch<SetStateAction<PendingAttack | null>>,
        setEsquivaRoll: Dispatch<SetStateAction<RollResult | null>>,
        setPendingFreeResponse: Dispatch<SetStateAction<{ responderId: string, paralyzedId: string } | null>>,
        setPendingCardResolution: Dispatch<SetStateAction<Token | null>>,
        setPendingOffensiveCard: Dispatch<SetStateAction<Card | undefined>>,
        setOffensiveCardAttackerId: Dispatch<SetStateAction<string | null>>,
        setPendingSpecialResponse: Dispatch<SetStateAction<PendingSpecialResponse | null>>,
        getCurrentMapId: () => string | undefined,
    ) {
        this.socket = socket
        this.setPendingAttack = setPendingAttack
        this.setEsquivaRoll = setEsquivaRoll
        this.setPendingFreeResponse = setPendingFreeResponse
        this.setPendingCardResolution = setPendingCardResolution
        this.setPendingOffensiveCard = setPendingOffensiveCard
        this.setOffensiveCardAttackerId = setOffensiveCardAttackerId
        this.setPendingSpecialResponse = setPendingSpecialResponse
        this.getCurrentMapId = getCurrentMapId
    }

    register() {
        this.socket.on(SocketEvent.PENDING_ATTACK, this.onPendingAttack)
        this.socket.on(SocketEvent.PENDING_CARD_RESOLUTION, this.onPendingCardResolution)
        this.socket.on(SocketEvent.PENDING_ESQUIVA_ROLL, this.onPendingEsquivaRoll)
        this.socket.on(SocketEvent.PENDING_OFFENSIVE_CARD, this.onPendingOffensiveCard)
        this.socket.on(SocketEvent.PENDING_FREE_RESPONSE, this.onPendingFreeReponse)
        this.socket.on(SocketEvent.PENDING_SPECIAL_RESPONSE, this.onPendingSpecialResponse)
    }

    unregister() {
        this.socket.off(SocketEvent.PENDING_ATTACK, this.onPendingAttack)
        this.socket.off(SocketEvent.PENDING_CARD_RESOLUTION, this.onPendingCardResolution)
        this.socket.off(SocketEvent.PENDING_ESQUIVA_ROLL, this.onPendingEsquivaRoll)
        this.socket.off(SocketEvent.PENDING_OFFENSIVE_CARD, this.onPendingOffensiveCard)
        this.socket.off(SocketEvent.PENDING_FREE_RESPONSE, this.onPendingFreeReponse)
        this.socket.off(SocketEvent.PENDING_SPECIAL_RESPONSE, this.onPendingSpecialResponse)
    }

    private onPendingAttack = (pendingAttack: any) => {
        const pending = PendingAttackMapper(pendingAttack)
        this.setPendingAttack(pending)
    }

    private onPendingCardResolution = (pendingCardResolution: any) => {
        try {
            console.info("PAYLOAD RECEBIDA: ", pendingCardResolution);

            // Passa os dados com fallbacks seguros para evitar crash no mapper
            const cardsParam = pendingCardResolution?.cards ?? [];
            const itemsParam = pendingCardResolution?.items ?? [];

            if(!pendingCardResolution || !pendingCardResolution.id) {
                this.setPendingCardResolution(null)
                return
            }

            const pending = TokenInstaceMapper(pendingCardResolution, cardsParam, itemsParam);

            console.info("P >>>>> ", pending);
            this.setPendingCardResolution(pending);
        } catch (error) {
            console.error("Erro ao processar onPendingCardResolution:", error);
        }
    }

    private onPendingFreeReponse = (pendingFreeResponse: any) => {
        const pending = PendingFreeResponseMapper(pendingFreeResponse)
        this.setPendingFreeResponse(pending)
    }

    private onPendingEsquivaRoll = (pendingEsquivaRoll: any) => {
        const pending = PendingEsquivaRollMapper(pendingEsquivaRoll)
        this.setEsquivaRoll(pending)
    }

    private onPendingOffensiveCard = (payload: unknown) => {
        const pendingOffensiveCard = payload as { card?: unknown; attackerId?: unknown } | null
        if (!pendingOffensiveCard?.card || typeof pendingOffensiveCard.attackerId !== "string") {
            this.setPendingOffensiveCard(undefined)
            this.setOffensiveCardAttackerId(null)
            return
        }

        this.setPendingOffensiveCard(CardMapper(pendingOffensiveCard.card))
        this.setOffensiveCardAttackerId(pendingOffensiveCard.attackerId)
    }

    private onPendingSpecialResponse = (payload: unknown) => {
        if (!payload || typeof payload !== "object") return
        const envelope = payload as { mapId?: unknown; pending?: unknown }
        if (
            typeof envelope.mapId !== "string" ||
            envelope.mapId !== this.getCurrentMapId()
        ) return

        if (envelope.pending === null) {
            this.setPendingSpecialResponse(null)
            return
        }
        if (!envelope.pending || typeof envelope.pending !== "object") return

        const pending = envelope.pending as Partial<PendingSpecialResponse>
        if (
            typeof pending.requestId !== "string" ||
            typeof pending.responderTokenId !== "string" ||
            typeof pending.responderUserId !== "string" ||
            typeof pending.title !== "string" ||
            !Array.isArray(pending.fields) ||
            typeof pending.createdAt !== "string"
        ) return

        this.setPendingSpecialResponse(pending as PendingSpecialResponse)
    }

}
