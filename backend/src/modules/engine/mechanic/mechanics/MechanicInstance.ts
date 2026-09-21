export interface MechanicInstance {
    id: string;
    definitionId: string;
    name: string;
    sourceTokenId: string;
    intensity: number;
    duration?: number;
    metadata: Record<string, unknown>;
}
