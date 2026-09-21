
import { MechanicEventType } from "../MechanicEventType";
import { MechanicDefinition } from "./MechanicDefinition";
import { DamageInitTurnBehavior } from "../behaviors/DamageInitTurnBehavior";
import { VisualOverlay } from "../types/visualOverlays";

export class EletricMechanic extends MechanicDefinition {
    id = "25";
    name = "eletric";
    behavior = [new DamageInitTurnBehavior()];
    abstractlistensTo = [MechanicEventType.TURN_INIT];
    defaultIntensity = 1;
    defaultDuration = 8;
    config?: Record<string, unknown>;

    override getVisualOverlay(): VisualOverlay | null {
        return {
            id: crypto.randomUUID(),
            type: "eletric-mechanic",
            size: 1.5,
            offset: 0,
            gifPath: "//https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExdDhvZXB0amljazUzcnQ0YmFheWlocmc3azhmYm9scDdkdWRiY3RmcyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/QAsu4cugSWDOo7JI8Y/giphy.gif",
        }
    }
}