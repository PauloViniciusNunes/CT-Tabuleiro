import type { EnvironmentData } from "../../operators/EnvironmentOperator";
import type { MechanicInstance } from "../mechanics/MechanicInstance";
import { Interceptor } from "./Interceptor";
import { InterceptorType } from "./InterceptorType";

/** Cancels environment operations matching reusable provenance filters. */
export class CancelEnvironmentChangeInterceptor extends Interceptor<EnvironmentData> {
    readonly type = InterceptorType.ENVIRONMENT_CHANGE;

    intercept(
        data: Readonly<EnvironmentData>,
        mechanic: Readonly<MechanicInstance>,
    ): EnvironmentData {
        const deniedCause = mechanic.metadata.deniedCause;
        const deniedKind = mechanic.metadata.deniedEnvironmentKind;
        const causeMatches = typeof deniedCause !== "string" || data.cause === deniedCause;
        const kindMatches = typeof deniedKind !== "string" || data.change.kind === deniedKind;

        console.log("[ CAUSE MATCHES ]: ", causeMatches)
        console.log("[ KIND MATCHES ]: ", kindMatches)

        return causeMatches && kindMatches
            ? { ...data, cancelled: true }
            : { ...data };
    }
}
