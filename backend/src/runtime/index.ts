import "dotenv/config";

import { SocketRuntimeClient } from "./SocketRuntimeClient";

export const runtime = SocketRuntimeClient.getInstance();