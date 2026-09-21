export interface VisualOverlay {
    id: string,
    type: string,
    size: number,
    offset: number,
    gifPath: string,
    /** Active mechanic instances currently represented by this visual. */
    mechanicInstanceIds?: string[]
}
