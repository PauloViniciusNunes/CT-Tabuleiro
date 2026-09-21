import type { EnvironmentData } from "../../operators/EnvironmentOperator";
import { MechanicEventType } from "../MechanicEventType";
import { MechanicEvent } from "./MechanicEvent";

export class EnvironmentChangedEvent extends MechanicEvent {
    readonly type = MechanicEventType.ENVIRONMENT_CHANGED;

    constructor(readonly environment: EnvironmentData) {
        super();
    }
}

export class EnvironmentChangeDeniedEvent extends MechanicEvent {
    readonly type = MechanicEventType.ENVIRONMENT_CHANGE_DENIED;

    constructor(readonly environment: EnvironmentData) {
        super();
    }
}
