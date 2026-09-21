
import { MechanicEventType } from "../MechanicEventType";
import { MechanicDefinition } from "./MechanicDefinition";
import { DamageInitTurnBehavior } from "../behaviors/DamageInitTurnBehavior";
import { VisualOverlay } from "../types/visualOverlays";

export class FireballMechanic extends MechanicDefinition {
    id = "30";
    name = "fireball-mechanic";
    behavior = [];
    abstractlistensTo = [];
    defaultIntensity = 1;
    defaultDuration = 8;
    config?: Record<string, unknown>;

}