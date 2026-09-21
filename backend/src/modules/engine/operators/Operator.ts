import type { MechanicEvent } from "../mechanic/events/MechanicEvent";
import type {
    InterceptableData,
} from "../mechanic/interceptors/Interceptor";
import type { InterceptorType } from "../mechanic/interceptors/InterceptorType";

export type InterceptOperation = <T extends InterceptableData>(
    type: InterceptorType,
    data: T,
    battleId: string,
) => Promise<T>;

export type DispatchMechanicEvent = (
    battleId: string,
    event: MechanicEvent,
    data?: Record<string, unknown>
) => Promise<void>;

export interface OperatorRuntime {
    readonly intercept: InterceptOperation;
    readonly dispatchEvent: DispatchMechanicEvent;
}

export abstract class Operator<Input, Output = Input> {
    constructor(protected readonly runtime: OperatorRuntime) {}

    abstract execute(input: Input): Promise<Output>;
}
