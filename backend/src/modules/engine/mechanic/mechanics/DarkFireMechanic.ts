import { MechanicEventType } from "../MechanicEventType";
import { MechanicDefinition } from "./MechanicDefinition";
import { DamageInitTurnBehavior } from "../behaviors/DamageInitTurnBehavior";
import { VisualOverlay } from "../types/visualOverlays";

export class DarkFireMechanic extends MechanicDefinition {
    id = "24";
    name = "dark-fire";
    behavior = [new DamageInitTurnBehavior()];
    abstractlistensTo = [MechanicEventType.TURN_INIT];
    defaultIntensity = 1;
    defaultDuration = undefined;
    config?: Record<string, unknown>;

    override getVisualOverlay(): VisualOverlay | null {
        return {
            id: crypto.randomUUID(),
            type: "dark.fire-mechanic",
            size: 1.5,
            offset: 0,
            gifPath: "https://64.media.tumblr.com/9df720d9975d0c1db87e089324054c03/71a79d9fe5930589-ce/s400x600/2fc6d13d5edc576143483346db936e81b82c53c9.gifv",
        }
    }
}