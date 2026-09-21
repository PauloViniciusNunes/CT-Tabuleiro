import { Socket } from "socket.io-client";
import { SocketEvent } from "../../../backend/src/runtime/Events";
import type { Dispatch, SetStateAction } from "react";
import type { Token } from "../../types/token";
import type { PivotCandidate } from "../../types/pivot";
import type { Card } from "../../types/card";
import { CardMapper } from "../mappers/cardMapper";

/*

Eventos de FRONTEND que devem ser controlados pelo backend.

*/

export class FrontendSocketListener {
    private readonly socket: Socket
    private readonly setCardSelection: Dispatch<SetStateAction<boolean>>
    private readonly setDefenseResolution: Dispatch<SetStateAction<boolean>>
    private readonly setPreviewCells: Dispatch<SetStateAction<Set<string>>>
    private readonly setSelectedCell: Dispatch<SetStateAction<string | null>>
    private readonly setSelectedTarget: Dispatch<SetStateAction<Token | null>>
    private readonly setOffensiveCardScore: Dispatch<SetStateAction<number | null>>
    private readonly setOffensiveCardTestScore: Dispatch<SetStateAction<number | null>>
    private readonly setInTargetSelection: Dispatch<SetStateAction<boolean>>
    private readonly setAmbientPivotSelection: Dispatch<SetStateAction<boolean>>
    private readonly setSelectedPivots: Dispatch<SetStateAction<PivotCandidate[]>>
    private readonly setArmedCard: Dispatch<SetStateAction<Card | undefined>>
    private readonly setAmbientPivotPhase: Dispatch<SetStateAction<"awaiting-pivot" | "preview" | "confirm">>

    constructor(
        socket: Socket,
        setCardSelection: Dispatch<SetStateAction<boolean>>,
        setDefenseResolution: Dispatch<SetStateAction<boolean>>,
        setPreviewCells: Dispatch<SetStateAction<Set<string>>>,
        setSelectedTarget: Dispatch<SetStateAction<Token | null>>,
        setOffensiveCardScore: Dispatch<SetStateAction<number | null>>,
        setOffensiveCardTestScore: Dispatch<SetStateAction<number | null>>,
        setInTargetSelection: Dispatch<SetStateAction<boolean>>,
        setAmbientPivotSelection: Dispatch<SetStateAction<boolean>>,
        setSelectedPivots: Dispatch<SetStateAction<PivotCandidate[]>>,
        setArmedCard: Dispatch<SetStateAction<Card | undefined>>,
        setSelectedCell: Dispatch<SetStateAction<string | null>>,
        setAmbientPivotPhase: Dispatch<SetStateAction<"awaiting-pivot" | "preview" | "confirm">>
    ) {
        this.socket = socket
        this.setCardSelection = setCardSelection
        this.setDefenseResolution = setDefenseResolution
        this.setPreviewCells = setPreviewCells
        this.setSelectedTarget = setSelectedTarget
        this.setOffensiveCardScore = setOffensiveCardScore
        this.setOffensiveCardTestScore = setOffensiveCardTestScore
        this.setInTargetSelection = setInTargetSelection
        this.setAmbientPivotSelection = setAmbientPivotSelection
        this.setSelectedPivots = setSelectedPivots
        this.setArmedCard = setArmedCard
        this.setSelectedCell = setSelectedCell
        this.setAmbientPivotPhase = setAmbientPivotPhase
    }

    register() {
        this.socket.on(SocketEvent.FRONTEND_CARD_SELECTION, this.onCardSelection)
        this.socket.on(SocketEvent.FRONTEND_IN_DEFENSE_RESOLUTION, this.onDefenseResolution)
        this.socket.on(SocketEvent.FRONTEND_ADD_PREVIEW_CELLS, this.onAddPreviewCells)
        this.socket.on(SocketEvent.FRONTEND_SET_PREVIEW_CELLS, this.onSetPreviewCells)
        this.socket.on(SocketEvent.FRONTEND_SELECTED_CELL, this.onSelectedCell)
        this.socket.on(SocketEvent.FRONTEND_SELECTED_TARGET, this.onSelectedTarget)
        this.socket.on(SocketEvent.FRONTEND_OFFENSIVE_CARD_SCORE, this.offensiveCardScore)
        this.socket.on(SocketEvent.FRONTEND_OFFENSIVE_CARD_TEST_SCORE, this.onCardTestScore)
        this.socket.on(SocketEvent.FRONTEND_IN_TARGET_SELECTION, this.onInTargetSelection)
        this.socket.on(SocketEvent.FRONTEND_AMBIENT_PIVOT_SELECTION, this.onAmbientPivotSelection)
        this.socket.on(SocketEvent.FRONTEND_AMBIENT_PIVOT_PHASE, this.onAmbientPivotPhase)
        this.socket.on(SocketEvent.FRONTEND_SELECTED_PIVOTS, this.onSelectedPivots)
        this.socket.on(SocketEvent.FRONTEND_ARMED_CARD, this.onArmedCard)
    }

    unregister() {
        this.socket.off(SocketEvent.FRONTEND_CARD_SELECTION, this.onCardSelection)
        this.socket.off(SocketEvent.FRONTEND_IN_DEFENSE_RESOLUTION, this.onDefenseResolution)
        this.socket.off(SocketEvent.FRONTEND_ADD_PREVIEW_CELLS, this.onAddPreviewCells)
        this.socket.off(SocketEvent.FRONTEND_SET_PREVIEW_CELLS, this.onSetPreviewCells)
        this.socket.off(SocketEvent.FRONTEND_SELECTED_TARGET, this.onSelectedTarget)
        this.socket.off(SocketEvent.FRONTEND_OFFENSIVE_CARD_SCORE, this.offensiveCardScore)
        this.socket.off(SocketEvent.FRONTEND_OFFENSIVE_CARD_TEST_SCORE, this.onCardTestScore)
        this.socket.off(SocketEvent.FRONTEND_IN_TARGET_SELECTION, this.onInTargetSelection)
        this.socket.off(SocketEvent.FRONTEND_AMBIENT_PIVOT_SELECTION, this.onAmbientPivotSelection)
        this.socket.off(SocketEvent.FRONTEND_AMBIENT_PIVOT_PHASE, this.onAmbientPivotPhase)
        this.socket.off(SocketEvent.FRONTEND_SELECTED_PIVOTS, this.onSelectedPivots)
        this.socket.off(SocketEvent.FRONTEND_ARMED_CARD, this.onArmedCard)
    }

    // 🟢 Convertidos para Arrow Functions para preservar 'this'
    private onCardSelection = (payload: unknown) => {
        const b = (payload as boolean)
        console.info("B >>>> ", b)
        this.setCardSelection(b)
    }

    private onDefenseResolution = (payload: unknown) => {
        const b = (payload as boolean)
        this.setDefenseResolution(b)
    }

    private onAddPreviewCells = (payload: unknown) => {
        const cells = (payload as { col: number, row: number }[])

        this.setPreviewCells(prev => {
            const next = new Set(prev);

            cells.forEach(c => {
                next.add(`${c.col}-${c.row}`);
            });

            return next;
        });
    }

    private onSetPreviewCells = (payload: unknown) => {
        // 🟢 1. Se o payload já for uma instância de Set (ex: new Set())
        if (payload instanceof Set) {
            this.setPreviewCells(payload as Set<string>);
            return;
        }

        // 🟢 2. Se for um Array de coordenadas [{ col, row }]
        if (Array.isArray(payload)) {
            const formattedCells = payload
                .filter((c): c is { col: number; row: number } =>
                    Boolean(c && typeof c.col === "number" && typeof c.row === "number")
                )
                .map((c) => `${c.col}-${c.row}`);

            this.setPreviewCells(new Set(formattedCells));
            return;
        }

        // 🟢 3. Fallback seguro para null, undefined ou tipos inesperados
        this.setPreviewCells(new Set());
    }

    private onSelectedCell = (payload: unknown) => {
        type Cell = string | null
        const cell = (payload as Cell)
        this.setSelectedCell(cell)
    }

    private onSelectedTarget = (payload: unknown) => {
        this.setSelectedTarget(payload ? payload as Token : null)
    }

    private offensiveCardScore = (payload: unknown) => {
        this.setOffensiveCardScore(typeof payload === "number" ? payload : null)
    }

    private onCardTestScore = (payload: unknown) => {
        this.setOffensiveCardTestScore(typeof payload === "number" ? payload : null)
    }

    private onInTargetSelection = (payload: unknown) => {
        const b = (payload as boolean)
        this.setInTargetSelection(b)
    }

    private onAmbientPivotSelection = (payload: unknown) => {
        const b = (payload as boolean)
        this.setAmbientPivotSelection(b)
    }

    private onAmbientPivotPhase = (payload: unknown) => {
        const v = (payload as ("awaiting-pivot" | "preview" | "confirm"))
        this.setAmbientPivotPhase(v)
    }

    private onSelectedPivots = (payload: unknown) => {
        this.setSelectedPivots(Array.isArray(payload) ? payload as PivotCandidate[] : [])
    }

    private onArmedCard = (payload: unknown) => {
        let value = undefined
        if (payload) value = CardMapper(payload)
        this.setArmedCard(value)
    }
}
