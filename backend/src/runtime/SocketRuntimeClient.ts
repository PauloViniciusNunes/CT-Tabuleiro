import { io, Socket } from "socket.io-client";

import "dotenv/config";

import { SocketEvent } from "./Events";

export class SocketRuntimeClient {

    private static instance: SocketRuntimeClient;

    private readonly socket: Socket;

    private constructor() {

        const SOCKET_URL =
            process.env.SOCKET_URL ?? "http://127.0.0.1:3001";


        console.log("[SERVER SOCKET]: ", SOCKET_URL)

        this.socket = io(SOCKET_URL, {
            autoConnect: true,
            reconnection: true,
        });

    }

    static getInstance(): SocketRuntimeClient {

        if (!SocketRuntimeClient.instance) {
            SocketRuntimeClient.instance =
                new SocketRuntimeClient();
        }

        return SocketRuntimeClient.instance;

    }

    emit(
        event: SocketEvent,
        payload: unknown,
    ) {

        this.socket.emit(event, payload);

    }

    joinMap(
        mapId: string,
    ) {

        this.socket.emit("join-map", mapId);

    }

}
