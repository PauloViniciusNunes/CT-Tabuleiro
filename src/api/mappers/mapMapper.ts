import type { Mapa } from "../../types/mapas";
import { TokenInstaceMapper } from "./tokenInstanceMapper";
import type { Card } from "../../types/card";
import type { Item } from "../../types/item";

export function MapMapper(json: any, cards: Card[], items: Item[]): Mapa {

    console.log("BoardTokens: ", json.boardTokens)

    return {
        name: json.name,
        id: json.id,
        rows: json.rows,
        cols: json.cols,
        img: json.img,
        mapObjs: json.mapObjs,
        boardTokens: json.boardTokens.map((j: any) => TokenInstaceMapper(j, cards, items)),
        campaignId: json.campaignId
    }
}

export function JsonMapMapper(mapa: Mapa): any {
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
        boardTokens: {
            connect: mapa.boardTokens.map(token => ({
                id: token.id,
            })),
        },

        mapObjs: mapa.mapObjs,   
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    }
}