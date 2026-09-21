import { MechanicEventType } from "../MechanicEventType";
import { MechanicEvent } from "./MechanicEvent";

export interface AttributeTestResolution {
    readonly resolutionId: string;
    readonly cardId: string;
    readonly sourceTokenId: string;
    readonly targetTokenId: string;
    readonly attribute: string;
    readonly succeeded: boolean;
    readonly total: number;
    readonly difficulty: number;
}

export class AttributeTestResolvedEvent extends MechanicEvent {
    readonly type = MechanicEventType.ATTRIBUTE_TEST_RESOLVED;

    constructor(readonly resolution: AttributeTestResolution) {
        super();
    }
}
