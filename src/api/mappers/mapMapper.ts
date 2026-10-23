import type { Mapa } from "../../types/mapas";
import { TokenInstaceMapper } from "./tokenInstanceMapper";
import type { Card } from "../../types/card";
import type { Item } from "../../types/item";
import { MapObjectMapper } from "./mapObjectMapper";

interface RawMap {
    readonly name?: unknown;
    readonly id?: unknown;
    readonly rows?: unknown;
    readonly cols?: unknown;
    readonly img?: unknown;
    readonly mapObjs?: unknown;
    readonly boardTokens?: unknown;
    readonly campaignId?: unknown;
}

export function MapMapper(value: unknown, cards: Card[], items: Item[]): Mapa {
    const json = value as RawMap;

    console.log("BoardTokens: ", json.boardTokens)

    return {
        name: String(json.name ?? ""),
        id: String(json.id ?? ""),
        rows: Number(json.rows ?? 25),
        cols: Number(json.cols ?? 25),
        img: typeof json.img === "string" ? json.img : "",
        mapObjs: Array.isArray(json.mapObjs)
            ? json.mapObjs.map((object: unknown) => MapObjectMapper(object, items))
            : [],
        boardTokens: Array.isArray(json.boardTokens)
            ? json.boardTokens.map((token: unknown) => TokenInstaceMapper(token, cards, items))
            : [],
        campaignId: String(json.campaignId ?? "")
    }
}

export function JsonMapMapper(mapa: Mapa) {
    return {
        id: mapa.id,
        img: mapa.img,
        name: mapa.name ,
        description: "",
        rows: mapa.rows,
        cols: mapa.cols,
        campaignId: mapa.campaignId, 

        campaign: {
            connect: {
                id: mapa.campaignId
            }
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    }
}
