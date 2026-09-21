import { MechanicEventType } from "../MechanicEventType";
import { MechanicDefinition } from "./MechanicDefinition";
import { DamageInitTurnBehavior } from "../behaviors/DamageInitTurnBehavior";
import { VisualOverlay } from "../types/visualOverlays";

export class FireMechanic extends MechanicDefinition {
    id = "1";
    name = "fire";
    behavior = [new DamageInitTurnBehavior()];
    abstractlistensTo = [MechanicEventType.TURN_INIT];
    defaultIntensity = 1;
    defaultDuration = 4;
    config?: Record<string, unknown>;

    override getVisualOverlay(): VisualOverlay | null {
        return {
            id: crypto.randomUUID(),
            type: "fire-mechanic",
            size: 1,
            offset: 0,
            gifPath: "https://cdn.pixabay.com/animation/2024/05/07/23/28/23-28-45-140_512.gif",
        }
    }
}