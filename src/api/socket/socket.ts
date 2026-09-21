import { io } from "socket.io-client";

const socketUrl = import.meta.env.VITE_SOCKET_URL?.trim();

// Sem override, o Socket.IO usa a mesma origem da página. No desenvolvimento,
// o Vite encaminha /socket.io para o runtime interno; no acesso remoto, o mesmo
// caminho atravessa o único Quick Tunnel.
export const socket = socketUrl
    ? io(socketUrl, { path: "/socket.io" })
    : io({ path: "/socket.io" });
