import { MechanicEventType } from "../MechanicEventType";
import { MechanicDefinition } from "./MechanicDefinition";
import { DamageInitTurnBehavior } from "../behaviors/DamageInitTurnBehavior";
import { VisualOverlay } from "../types/visualOverlays";
import { PullToCasterBehavior } from "../behaviors/PullToCasterBehavior";

export class GravityMechanic extends MechanicDefinition {
    id = "2";
    name = "gravity";
    behavior = [
        new DamageInitTurnBehavior(),
        new PullToCasterBehavior()
    ];
    abstractlistensTo = [MechanicEventType.TURN_INIT];
    defaultIntensity = 1;
    defaultDuration = 4;
    config?: Record<string, unknown>;

    override getVisualOverlay(): VisualOverlay | null {
        return {
            id: crypto.randomUUID(),
            type: "gravity-mechanic",
            size: 1.3,
            offset: 0,
            gifPath: "https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExMGFucmh3a2RkNDlvdzV5YzgxeWo5NnIyZWYybXRsMWxoNmVpYWYyOCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/xCSMAYB9m50YTmn8QK/giphy.gif",
        }
    }

    //
    //https://i.redd.it/pzvb1tz84wuc1.gif
}