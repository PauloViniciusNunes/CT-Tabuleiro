import type { ActionData } from "../../operators/ActionDispatchOperator";
import { Interceptor } from "./Interceptor";
import { InterceptorType } from "./InterceptorType";

export class ActionDispatchInterceptor extends Interceptor<ActionData> {

    readonly type = InterceptorType.ACTION_DISPATCH

    intercept(data: ActionData): ActionData {
        return { ...data };
    }

}
