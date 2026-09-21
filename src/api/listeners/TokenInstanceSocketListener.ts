import type { Dispatch, SetStateAction } from "react";

import { Socket } from "socket.io-client";
import { SocketEvent } from "../../../backend/src/runtime/Events";

import { TokenInstaceMapper } from "../mappers/tokenInstanceMapper";
import { inventoryItems } from "../mappers/tokenInventoryMapper";

import type { Token } from "../../types/token";
import type { Card } from "../../types/card";
import type { Item } from "../../types/item";

export class TokenInstanceSocketListener {

    private readonly socket: Socket;
    private readonly boardTokensRef: React.RefObject<Token[]>;
    private readonly setBoardTokens: Dispatch<SetStateAction<Token[]>>;
    private readonly setTokenInAmbientPivotSelection: Dispatch<SetStateAction<string>>
    private readonly cardsRef: React.RefObject<Card[]>;
    private readonly itemsRef: React.RefObject<Item[]>;

    constructor(
        socket: Socket,
        boardTokensRef: React.RefObject<Token[]>,
        setBoardTokens: Dispatch<SetStateAction<Token[]>>,
        setTokenInAmbientPivotSelection: Dispatch<SetStateAction<string>>,
        cardsRef: React.RefObject<Card[]>,
        itemsRef: React.RefObject<Item[]>,
    ) {

        this.socket = socket
        this.boardTokensRef = boardTokensRef
        this.setBoardTokens = setBoardTokens
        this.setTokenInAmbientPivotSelection = setTokenInAmbientPivotSelection
        this.cardsRef = cardsRef
        this.itemsRef = itemsRef

    }

    register() {

        this.socket.onAny(this.onAny)

        this.socket.on(SocketEvent.TOKEN_UPDATED, this.onTokenUpdated)
        this.socket.on(SocketEvent.TOKEN_CREATED, this.onTokenCreated)
        this.socket.on(SocketEvent.TOKEN_DELETED, this.onTokenDeleted)
        this.socket.on(SocketEvent.TOKEN_IN_AMBIENT_PIVOT_SELECTION, this.onTokenInAmbientPivotSelection)
    }

    unregister() {

        this.socket.offAny(this.onAny)

        this.socket.off(SocketEvent.TOKEN_UPDATED, this.onTokenUpdated)
        this.socket.off(SocketEvent.TOKEN_CREATED, this.onTokenCreated)
        this.socket.off(SocketEvent.TOKEN_DELETED, this.onTokenDeleted)
        this.socket.off(SocketEvent.TOKEN_IN_AMBIENT_PIVOT_SELECTION, this.onTokenInAmbientPivotSelection)

    }

    private onAny = (
        event: string,
        payload: unknown,
    ) => {

        console.info(event, payload)

    };

    private onTokenUpdated = (updatedToken: any) => {

        try {
            console.log("Upado")

            this.setBoardTokens(old =>
                old.map(token => {
                    if (token.id !== updatedToken.id) {
                        return token;
                    }

                    return TokenInstaceMapper(
                            updatedToken,
                            this.cardsRef.current ?? [],
                            [
                                ...inventoryItems(token.inventory),
                                ...(this.itemsRef.current ?? []),
                            ],
                        );
                })
            );
        } catch (error) {
            console.error("ERRO: ", error)
            throw new Error("Houve algum erro ao tentar atualizar os tokens.")
        }


    };

    private onTokenCreated = (createdToken: any) => {

        const token = TokenInstaceMapper(
            createdToken,
            this.cardsRef.current ?? [],
            this.itemsRef.current ?? [],
        )
        const exist = this.boardTokensRef.current.find((t) => t.id === token.id)

        if (exist) return

        this.setBoardTokens(prev => [...prev, token]);

    }

    private onTokenDeleted = (deletedToken: any) => {
        const token = TokenInstaceMapper(
            deletedToken,
            this.cardsRef.current ?? [],
            this.itemsRef.current ?? [],
        )
        this.setBoardTokens((prev) => prev.filter((t) => t.id !== token.id))
    }

    private onTokenInAmbientPivotSelection = (ambientToken: any) => {
        const id = ambientToken as string
        this.setTokenInAmbientPivotSelection(id)
    }

}
