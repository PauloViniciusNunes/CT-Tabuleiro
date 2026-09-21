import { runtime } from "@/runtime";
import { SocketEvent } from "@/runtime/Events";
import type { PendingSpecialResponse } from "./types";
import { toPublicPendingSpecialResponse } from "./types";

export function emitPendingSpecialResponse(
    mapId: string,
    pending: PendingSpecialResponse | null,
): void {
    runtime.emit(SocketEvent.PENDING_SPECIAL_RESPONSE, {
        mapId,
        pending: pending ? toPublicPendingSpecialResponse(pending) : null,
    });
}
