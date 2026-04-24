import type { MapObject } from "./mapObject";

export type Mapa = {
    name: string,
    id: string,
    rows: number,
    cols: number,
    img: string;
    mapObjs: MapObject[];
}