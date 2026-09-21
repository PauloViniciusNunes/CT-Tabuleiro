import type { MapObject } from "../types/mapObject";
import { cartesianMirror } from "../components/mechanisms/doors";
import type { Mapa } from "../types/mapas";

export function generatePairDoor(
    maps: Mapa[],
    selectedMapId: string | undefined,
    primaryDoor: MapObject,
): Mapa[] {
    if (
        !primaryDoor.linkedMapId ||
        !primaryDoor.linkedDoorId
    ) return maps;

    return maps.map(mapa => {

            // 🔥 encontrou mapa alvo
            if (mapa.id !== primaryDoor.linkedMapId) {
                return mapa;
            }


            // 🔥 posição espelhada
            const [mirrorCol, mirrorRow] = cartesianMirror(
                primaryDoor.position.col,
                primaryDoor.position.row,

                1,
                mapa.cols,

                1,
                mapa.rows
            );

            // 🔥 cria porta correspondente
            const pairDoor: MapObject = {
                id: primaryDoor.linkedDoorId ?? "",

                type: "door",

                position: {
                    col: mirrorCol,
                    row: mirrorRow
                },
                itemRelative: null,
                imgUrl: primaryDoor.imgUrl,

                // 🔥 agora linka de volta
                linkedMapId: selectedMapId,

                // 🔥 aponta para original
                linkedDoorId: primaryDoor.id,
            };

            return {
                ...mapa,
                mapObjs: [...mapa.mapObjs, pairDoor]
            };
        });
}
