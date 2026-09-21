import { Behavior } from "../behaviors/Behavior";
import type { Interceptor } from "../interceptors/Interceptor";
import { MechanicEventType } from "../MechanicEventType";
import { VisualOverlay } from "../types/visualOverlays";

export abstract class MechanicDefinition {
    abstract id: string;
    abstract name: string;
    abstract behavior: Behavior[];
    abstract abstractlistensTo: MechanicEventType[];
    abstract defaultIntensity: number;
    abstract defaultDuration?: number;
    abstract config?: Record<string, unknown>;
    readonly interceptors: readonly Interceptor[] = [];

    getVisualOverlay(): VisualOverlay | null {
        return null
    }
}
