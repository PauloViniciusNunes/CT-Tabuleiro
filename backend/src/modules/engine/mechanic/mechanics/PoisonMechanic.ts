import { MechanicEventType } from "../MechanicEventType";
import { MechanicDefinition } from "./MechanicDefinition";
import { DamageInitTurnBehavior } from "../behaviors/DamageInitTurnBehavior";
import { VisualOverlay } from "../types/visualOverlays";

export class PoisonMechanic extends MechanicDefinition {
    id = "33";
    name = "poison";
    behavior = [new DamageInitTurnBehavior()];
    abstractlistensTo = [MechanicEventType.TURN_INIT];
    defaultIntensity = 1;
    defaultDuration = 8;
    config?: Record<string, unknown> = {
        periodicDamage: 0
    };

    override getVisualOverlay(): VisualOverlay | null {
        return {
            id: crypto.randomUUID(),
            type: "poison-mechanic",
            size: 2,
            offset: 0,
            gifPath: "https://res.cloudinary.com/tkm8lvqs/image/upload/v1789912117/poison.gif",
        }
    }
}