import { Socket } from "socket.io-client";
import { SocketEvent } from "../socket/events";
import type { Dispatch, SetStateAction } from "react";
import { PendingAttackMapper } from "../mappers/pendingMappers";
import { PendingEsquivaRollMapper } from "../mappers/pendingMappers";
import { PendingFreeResponseMapper } from "../mappers/pendingMappers";
import type { PendingAttack } from "../../types/battle";
import type { RollResult } from "../../types/battle";
import type { Token } from "../../types/token";
import { TokenInstaceMapper } from "../mappers/tokenInstanceMapper";
import type { Card } from "../../types/card";
import type { Item } from "../../types/item";
import { CardMapper } from "../mappers/cardMapper";
import type { PendingSpecialResponse } from "../../types/specialResponse";
import type { PendingTransformationResolution } from "../../types/transformation";

export class PendingSocketListener {

    private readonly socket: Socket;
    private readonly setPendingAttack: Dispatch<SetStateAction<PendingAttack | null>>
    private readonly setEsquivaRoll: Dispatch<SetStateAction<RollResult | null>>
    private readonly setPendingFreeResponse: Dispatch<SetStateAction<{ requestId: string, responderId: string, paralyzedId: string } | null>>
    private readonly setPendingCardResolution: Dispatch<SetStateAction<Token | null>>
    private readonly setPendingOffensiveCard: Dispatch<SetStateAction<Card | undefined>>
    private readonly setOffensiveCardAttackerId: Dispatch<SetStateAction<string | null>>
    private readonly setOffensiveCardResolutionId: Dispatch<SetStateAction<string | null>>
    private readonly setOffensiveCardScore: Dispatch<SetStateAction<number | null>>
    private readonly setOffensiveCardTestScore: Dispatch<SetStateAction<number | null>>
    private readonly setCardSelection: Dispatch<SetStateAction<boolean>>
    private readonly setDefenseResolution: Dispatch<SetStateAction<boolean>>
    private readonly setAmbientPivotSelection: Dispatch<SetStateAction<boolean>>
    private readonly setArmedCard: Dispatch<SetStateAction<Card | undefined>>
    private readonly setTokenInAmbientPivotSelection: Dispatch<SetStateAction<string>>
    private readonly setAmbientPivotPhase: Dispatch<SetStateAction<"awaiting-pivot" | "preview" | "confirm">>
    private readonly setPendingSpecialResponse: Dispatch<SetStateAction<PendingSpecialResponse | null>>
    private readonly setPendingTransformation: Dispatch<SetStateAction<PendingTransformationResolution | null>>
    private readonly getCurrentMapId: () => string | undefined

    constructor(
        socket: Socket,
        setPendingAttack: Dispatch<SetStateAction<PendingAttack | null>>,
        setEsquivaRoll: Dispatch<SetStateAction<RollResult | null>>,
        setPendingFreeResponse: Dispatch<SetStateAction<{ requestId: string, responderId: string, paralyzedId: string } | null>>,
        setPendingCardResolution: Dispatch<SetStateAction<Token | null>>,
        setPendingOffensiveCard: Dispatch<SetStateAction<Card | undefined>>,
        setOffensiveCardAttackerId: Dispatch<SetStateAction<string | null>>,
        setOffensiveCardResolutionId: Dispatch<SetStateAction<string | null>>,
        setOffensiveCardScore: Dispatch<SetStateAction<number | null>>,
        setOffensiveCardTestScore: Dispatch<SetStateAction<number | null>>,
        setCardSelection: Dispatch<SetStateAction<boolean>>,
        setDefenseResolution: Dispatch<SetStateAction<boolean>>,
        setAmbientPivotSelection: Dispatch<SetStateAction<boolean>>,
        setArmedCard: Dispatch<SetStateAction<Card | undefined>>,
        setTokenInAmbientPivotSelection: Dispatch<SetStateAction<string>>,
        setAmbientPivotPhase: Dispatch<SetStateAction<"awaiting-pivot" | "preview" | "confirm">>,
        setPendingSpecialResponse: Dispatch<SetStateAction<PendingSpecialResponse | null>>,
        setPendingTransformation: Dispatch<SetStateAction<PendingTransformationResolution | null>>,
        getCurrentMapId: () => string | undefined,
    ) {
        this.socket = socket
        this.setPendingAttack = setPendingAttack
        this.setEsquivaRoll = setEsquivaRoll
        this.setPendingFreeResponse = setPendingFreeResponse
        this.setPendingCardResolution = setPendingCardResolution
        this.setPendingOffensiveCard = setPendingOffensiveCard
        this.setOffensiveCardAttackerId = setOffensiveCardAttackerId
        this.setOffensiveCardResolutionId = setOffensiveCardResolutionId
        this.setOffensiveCardScore = setOffensiveCardScore
        this.setOffensiveCardTestScore = setOffensiveCardTestScore
        this.setCardSelection = setCardSelection
        this.setDefenseResolution = setDefenseResolution
        this.setAmbientPivotSelection = setAmbientPivotSelection
        this.setArmedCard = setArmedCard
        this.setTokenInAmbientPivotSelection = setTokenInAmbientPivotSelection
        this.setAmbientPivotPhase = setAmbientPivotPhase
        this.setPendingSpecialResponse = setPendingSpecialResponse
        this.setPendingTransformation = setPendingTransformation
        this.getCurrentMapId = getCurrentMapId
    }

    register() {
        this.socket.on(SocketEvent.BATTLE_FORM_STATE, this.onBattleFormState)
        this.socket.on(SocketEvent.BATTLE_ENDED, this.onBattleEnded)
    }

    unregister() {
        this.socket.off(SocketEvent.BATTLE_FORM_STATE, this.onBattleFormState)
        this.socket.off(SocketEvent.BATTLE_ENDED, this.onBattleEnded)
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


    private onBattleFormState = (payload: unknown) => {
        if (!payload || typeof payload !== "object") return
        const snapshot = payload as Record<string, unknown>
        if (
            typeof snapshot.mapId !== "string" ||
            snapshot.mapId !== this.getCurrentMapId()
        ) return

        const pendingAttack = PendingAttackMapper(snapshot.pendingAttack)
        const pendingEsquivaRoll = PendingEsquivaRollMapper(snapshot.pendingEsquivaRoll)
        this.setPendingAttack(pendingAttack)
        this.setEsquivaRoll(pendingEsquivaRoll)
        this.setPendingFreeResponse(PendingFreeResponseMapper(snapshot.pendingFreeResponse))
        this.setDefenseResolution(Boolean(pendingAttack && pendingEsquivaRoll))

        const rawCardResolution = snapshot.pendingCardResolution
        if (
            rawCardResolution &&
            typeof rawCardResolution === "object" &&
            "id" in rawCardResolution &&
            typeof rawCardResolution.id === "string"
        ) {
            const rawToken = rawCardResolution as Record<string, unknown>
            const cards = Array.isArray(rawToken.cards) ? rawToken.cards as Card[] : []
            const items = Array.isArray(rawToken.items) ? rawToken.items as Item[] : []
            this.setPendingCardResolution(TokenInstaceMapper(rawToken, cards, items))
            this.setCardSelection(true)
        } else {
            this.setPendingCardResolution(null)
            this.setCardSelection(false)
        }

        const offensive = snapshot.pendingOffensiveCard
        if (offensive && typeof offensive === "object") {
            const value = offensive as Record<string, unknown>
            if (value.card && typeof value.attackerId === "string") {
                this.setPendingOffensiveCard(CardMapper(value.card))
                this.setOffensiveCardAttackerId(value.attackerId)
                this.setOffensiveCardResolutionId(typeof value.requestId === "string" ? value.requestId : null)
                this.setOffensiveCardScore(typeof value.cardScore === "number" ? value.cardScore : null)
                this.setOffensiveCardTestScore(typeof value.testScore === "number" ? value.testScore : null)
            } else {
                this.clearOffensiveCard()
            }
        } else {
            this.clearOffensiveCard()
        }

        const ambient = snapshot.ambientPivot
        if (ambient && typeof ambient === "object") {
            const value = ambient as Record<string, unknown>
            if (value.armedCard && typeof value.tokenId === "string") {
                this.setAmbientPivotSelection(true)
                this.setArmedCard(CardMapper(value.armedCard))
                this.setTokenInAmbientPivotSelection(value.tokenId)
                this.setAmbientPivotPhase(value.phase === "preview" ? "preview" : "awaiting-pivot")
            } else {
                this.clearAmbientPivot()
            }
        } else {
            this.clearAmbientPivot()
        }

        const rawTransformation = snapshot.pendingTransformationResolution
        if (rawTransformation && typeof rawTransformation === "object") {
            const value = rawTransformation as Record<string, unknown>
            if (
                typeof value.requestId === "string" &&
                typeof value.tokenId === "string" &&
                typeof value.ownerId === "string" &&
                Array.isArray(value.options)
            ) {
                this.setPendingTransformation(
                    value as unknown as PendingTransformationResolution,
                )
            } else {
                this.setPendingTransformation(null)
            }
        } else {
            this.setPendingTransformation(null)
        }

        this.onPendingSpecialResponse({
            mapId: snapshot.mapId,
            pending: snapshot.pendingSpecialResponse ?? null,
        })
    }

    private onBattleEnded = (payload: unknown) => {
        if (!payload || typeof payload !== "object") return
        const mapId = (payload as { mapId?: unknown }).mapId
        if (mapId !== this.getCurrentMapId()) return
        this.setPendingAttack(null)
        this.setEsquivaRoll(null)
        this.setPendingFreeResponse(null)
        this.setPendingCardResolution(null)
        this.setCardSelection(false)
        this.setDefenseResolution(false)
        this.setPendingSpecialResponse(null)
        this.setPendingTransformation(null)
        this.clearOffensiveCard()
        this.clearAmbientPivot()
    }

    private clearAmbientPivot() {
        this.setAmbientPivotSelection(false)
        this.setArmedCard(undefined)
        this.setTokenInAmbientPivotSelection("")
        this.setAmbientPivotPhase("confirm")
    }

    private clearOffensiveCard() {
        this.setPendingOffensiveCard(undefined)
        this.setOffensiveCardAttackerId(null)
        this.setOffensiveCardResolutionId(null)
        this.setOffensiveCardScore(null)
        this.setOffensiveCardTestScore(null)
    }

}
