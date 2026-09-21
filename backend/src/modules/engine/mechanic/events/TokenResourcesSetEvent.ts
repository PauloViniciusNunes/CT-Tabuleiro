import type { TokenResourceData } from "../../operators/TokenResourceOperator";
import { MechanicEventType } from "../MechanicEventType";
import { MechanicEvent } from "./MechanicEvent";

export class TokenResourcesSetEvent extends MechanicEvent {
    readonly type = MechanicEventType.TOKEN_RESOURCES_SET;

    constructor(readonly resources: TokenResourceData) {
        super();
    }
}
