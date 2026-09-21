import { Behavior } from "../behaviors/Behavior";
import { ProficiencyRollPenaltyInterceptor } from "../interceptors/ProficiencyRollPenaltyInterceptor";
import { MechanicEventType } from "../MechanicEventType";
import { MechanicDefinition } from "./MechanicDefinition";
import { SuperPerceptionFormularyBehavior } from "../behaviors/SuperPerceptionFormularyBehavior";

export class SwapLifeByManaMechanic extends MechanicDefinition {
    id: string = "30";
    name: string = "swap-life-mana-mechanic";
    behavior: Behavior[] = [];
    abstractlistensTo: MechanicEventType[] = [];
    defaultIntensity: number = 1;
    defaultDuration?: number | undefined = undefined;
    config?: Record<string, unknown> | undefined;
    override readonly interceptors = [];
}
