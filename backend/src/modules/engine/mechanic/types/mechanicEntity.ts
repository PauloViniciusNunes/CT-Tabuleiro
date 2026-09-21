export type TokenTeam = "Red" | "Blue" | "Green" | "Yellow";

export interface Pivot {
    areaImgUrl: string;
    pivotType:  string;
    range:      number;
}

export type MechanicEntityInstance = {
    id: string; // Adicionado.
    triggerId: string;
    anchorTokenId?: string;
    effectToApply: string[];
    pivotSettings: Pivot;
    duration: number;
    position:  {
        col: number,
        row: number,
    };
    friendlyTeam?: TokenTeam;

}