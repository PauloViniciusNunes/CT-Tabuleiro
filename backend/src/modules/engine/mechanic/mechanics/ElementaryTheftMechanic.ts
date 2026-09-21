import { MechanicEventType } from "../MechanicEventType";
import { MechanicDefinition } from "./MechanicDefinition";
import { DamageInitTurnBehavior } from "../behaviors/DamageInitTurnBehavior";
import { VisualOverlay } from "../types/visualOverlays";
import { ElementaryTheftBehavior } from "../behaviors/ElementaryTheftBehavior";

export class ElementaryTheftMechanic extends MechanicDefinition {
    id = "23";
    name = "elementary-theft";
    behavior = [new ElementaryTheftBehavior()];
    abstractlistensTo = [MechanicEventType.DAMAGE_RECEIVED];
    defaultIntensity = 1;
    defaultDuration = undefined;
    config?: Record<string, unknown>;
}