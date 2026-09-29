import type { MovementData } from "../../operators/MovementOperator";
import type { MechanicInstance } from "../mechanics/MechanicInstance";
import { Interceptor } from "./Interceptor";
import { InterceptorType } from "./InterceptorType";

const VOLUNTARY_MOVEMENT_CAUSE = "BOARD_DRAG";

function movementBlockedTokenId(mechanic: Readonly<MechanicInstance>): string {
    const configuredTargetId = mechanic.metadata.targetId;

    return typeof configuredTargetId === "string" && configuredTargetId
        ? configuredTargetId
        : mechanic.sourceTokenId;
}

/** Blocks board-initiated movement while preserving forced displacement effects. */
export class CancelVoluntaryMovementInterceptor extends Interceptor<MovementData> {
    readonly type = InterceptorType.MOVEMENT;

    intercept(
        data: Readonly<MovementData>,
        mechanic: Readonly<MechanicInstance>,
    ): MovementData {
        if (
            data.tokenId !== movementBlockedTokenId(mechanic) ||
            data.cause !== VOLUNTARY_MOVEMENT_CAUSE
        ) {
            return { ...data };
        }

        return {
            ...data,
            cancelled: true,
        };
    }
}
