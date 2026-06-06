import type { MapObject } from "../types/mapObject";
import { cartesianMirror } from "../components/mechanisms/doors";
import type { EngineContext } from "../types/BoardEngineContext";

export function generatePairDoor(context: EngineContext, primaryDoor: MapObject) {
    if (
        !primaryDoor.linkedMapId ||
        !primaryDoor.linkedDoorId
    ) return;

    context.setMapas(prev =>
        prev.map(mapa => {

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
                linkedMapId: context.selectedMapa?.id,

                // 🔥 aponta para original
                linkedDoorId: primaryDoor.id,
            };

            return {
                ...mapa,
                mapObjs: [...mapa.mapObjs, pairDoor]
            };
        })
    );
}