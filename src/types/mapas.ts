import type { MapObject } from "./mapObject";
import type { Token } from "./token";

export type Mapa = {
    name: string,
    id: string,
    rows: number,
    cols: number,
    img: string;
    mapObjs: MapObject[];
    boardTokens: Token[];
}