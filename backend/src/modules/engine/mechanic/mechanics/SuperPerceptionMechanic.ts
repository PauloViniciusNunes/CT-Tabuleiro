import { Behavior } from "../behaviors/Behavior";
import { ProficiencyRollPenaltyInterceptor } from "../interceptors/ProficiencyRollPenaltyInterceptor";
import { MechanicEventType } from "../MechanicEventType";
import { MechanicDefinition } from "./MechanicDefinition";
import { SuperPerceptionFormularyBehavior } from "../behaviors/SuperPerceptionFormularyBehavior";

export class SuperPerceptionMechanic extends MechanicDefinition {
    id: string = "19";
    name: string = "super-perception-mechanic";
    behavior: Behavior[] = [new SuperPerceptionFormularyBehavior()];
    abstractlistensTo: MechanicEventType[] = [MechanicEventType.ACTION_DISPATCH_REQUESTED];
    defaultIntensity: number = 1;
    defaultDuration?: number | undefined = undefined;
    config?: Record<string, unknown> | undefined;
    override readonly interceptors = [new ProficiencyRollPenaltyInterceptor()];
}
