import { MechanicEventType } from "../MechanicEventType";
import { MechanicDefinition } from "./MechanicDefinition";
import { VisualOverlay } from "../types/visualOverlays";
import { CancelActionAndApplyMechanicInterceptor } from "../interceptors/CancelActionAndApplyMechanicInterceptor";

export class CancelTargetActionAndApplyFireMechanic extends MechanicDefinition {
    id = "43";
    name = "cancel-action-fire-apply";
    behavior = [];
    abstractlistensTo = [MechanicEventType.ACTION_DISPATCH];
    defaultIntensity = 1;
    defaultDuration = undefined;
    config?: Record<string, unknown> = {
        charges: 3
    };
    override readonly interceptors = [new CancelActionAndApplyMechanicInterceptor("fogo")];    

    // Opcional
    override getVisualOverlay(): VisualOverlay | null {
        return {
            id: crypto.randomUUID(),
            type: "cancel-action-fire-apply-mechanic",
            size: 1.5,
            offset: 0,
            gifPath: "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExc2NuMW5wZms3M2h6MTkxY3Q2NzIwaHpzZWFjZjc2a3E0cTIxNXVhcSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/Pv6eTiHrRihB6rWLc0/giphy.gif",
        }
    }
}