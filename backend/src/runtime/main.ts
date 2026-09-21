import "dotenv/config";

import { SocketServer } from "./SocketServer";

console.log("=================================");
console.log(" CT-Tabuleiro Socket Runtime");
console.log("=================================");

SocketServer.getInstance();

console.log("Socket Runtime iniciado.");