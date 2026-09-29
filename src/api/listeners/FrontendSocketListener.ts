import { Socket } from "socket.io-client";
import { SocketEvent } from "../socket/events";
import type { Dispatch, SetStateAction } from "react";

/*

Eventos de FRONTEND que devem ser controlados pelo backend.

*/

export class FrontendSocketListener {
    private readonly socket: Socket
    private readonly setPreviewCells: Dispatch<SetStateAction<Set<string>>>
    private readonly getCurrentMapId: () => string | undefined

    constructor(
        socket: Socket,
        setPreviewCells: Dispatch<SetStateAction<Set<string>>>,
        getCurrentMapId: () => string | undefined,
    ) {
        this.socket = socket
        this.setPreviewCells = setPreviewCells
        this.getCurrentMapId = getCurrentMapId
    }

    register() {
        this.socket.on(SocketEvent.FRONTEND_ADD_PREVIEW_CELLS, this.onAddPreviewCells)
        this.socket.on(SocketEvent.FRONTEND_SET_PREVIEW_CELLS, this.onSetPreviewCells)
    }

    unregister() {
        this.socket.off(SocketEvent.FRONTEND_ADD_PREVIEW_CELLS, this.onAddPreviewCells)
        this.socket.off(SocketEvent.FRONTEND_SET_PREVIEW_CELLS, this.onSetPreviewCells)
    }

    // 🟢 Convertidos para Arrow Functions para preservar 'this'
    private onAddPreviewCells = (payload: unknown) => {
        const value = this.readMapValue(payload)
        if (!Array.isArray(value)) return
        const cells = value as { col: number, row: number }[]

        this.setPreviewCells(prev => {
            const next = new Set(prev);

            cells.forEach(c => {
                next.add(`${c.col}-${c.row}`);
            });

            return next;
        });
    }

    private onSetPreviewCells = (payload: unknown) => {
        const value = this.readMapValue(payload)
        if (value === undefined) return
        // 🟢 1. Se o payload já for uma instância de Set (ex: new Set())
        if (value instanceof Set) {
            this.setPreviewCells(value as Set<string>);
            return;
        }

        // 🟢 2. Se for um Array de coordenadas [{ col, row }]
        if (Array.isArray(value)) {
            const formattedCells = value
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



    private readMapValue(payload: unknown): unknown {
        if (!payload || typeof payload !== "object") return undefined
        const envelope = payload as { mapId?: unknown; value?: unknown }
        return envelope.mapId === this.getCurrentMapId() ? envelope.value : undefined
    }

}
