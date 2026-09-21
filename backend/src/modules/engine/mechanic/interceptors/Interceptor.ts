import type { MechanicInstance } from "../mechanics/MechanicInstance";
import type { InterceptorType } from "./InterceptorType";

export interface InterceptableData {
    readonly cancelled?: boolean;
}

export interface ActiveInterceptor<T extends InterceptableData> {
    readonly interceptor: Interceptor<T>;
    readonly mechanic: MechanicInstance;
}

export abstract class Interceptor<
    T extends InterceptableData = InterceptableData,
> {
    abstract readonly type: InterceptorType;
    /** Lower values execute first, allowing explicit precedence between rules. */
    readonly priority: number = 0;

    abstract intercept(
        data: Readonly<T>,
        mechanic: Readonly<MechanicInstance>,
    ): T | Promise<T>;

    static async executeAll<T extends InterceptableData>(
        initialData: T,
        activeInterceptors: readonly ActiveInterceptor<T>[],
    ): Promise<T> {
        let data = Object.freeze({ ...initialData }) as T;

        const orderedInterceptors = activeInterceptors
            .map((entry, index) => ({ ...entry, index }))
            .sort((left, right) =>
                left.interceptor.priority - right.interceptor.priority ||
                left.index - right.index,
            );

        for (const { interceptor, mechanic } of orderedInterceptors) {
            if (data.cancelled) break;

            const immutableMechanic = Object.freeze({
                ...mechanic,
                metadata: Object.freeze({ ...mechanic.metadata }),
            });

            data = Object.freeze({
                ...await interceptor.intercept(data, immutableMechanic),
            }) as T;
        }

        return data;
    }
}
