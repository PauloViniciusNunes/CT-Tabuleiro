import { MechanicEntityInstance } from "../types/mechanicEntity";
import { VisualOverlay } from "../types/visualOverlays";

export function mountVisualOverlay(
    id: string,
    type: string,
    size: number,
    offset: number,
    gifPath: string
): VisualOverlay {
    return {
        id,
        type,
        size,
        offset,
        gifPath
    }
}

export function mountMechanicEntity(
    triggerId: string,
    effectsMechanics: string[],
    img: string,
    pivotType: string,
    range: number,
    duration: number,
    col: number,
    row: number,
): MechanicEntityInstance {
    return {
        id: crypto.randomUUID(),
        triggerId: triggerId,
        effectToApply: effectsMechanics,
        pivotSettings: {
            areaImgUrl: img,
            pivotType: pivotType,
            range: range
        },
        duration: duration,
        position:{
            col,
            row
        },
    }
}

