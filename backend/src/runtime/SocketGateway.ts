import { Server, Socket } from "socket.io";
import { SocketEvent } from "./Events";

export class SocketGateway {

    constructor(
        private readonly io: Server,
    ) {}

    emit(
        room: string,
        event: SocketEvent,
        payload: unknown,
    ) {
        console.log("Emitindo", room, event);
        this.io.to(room).emit(event, payload);
    }

    broadcast(
        event: SocketEvent,
        payload: unknown,
    ) {
        this.io.emit(event, payload);
    }

    join(
        socket: Socket,
        room: string,
    ) {
        socket.join(room);
    }

    leave(
        socket: Socket,
        room: string,
    ) {
        socket.leave(room);
    }

}