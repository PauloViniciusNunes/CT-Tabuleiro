import { runtime } from "@/runtime";
import { SocketEvent } from "@/runtime/Events";
import { MapRepository } from "@/modules/maps/repositories/MapRepository";

export async function emitMapObjectsUpdated(
    mapIds: readonly string[],
    repository = new MapRepository(),
): Promise<void> {
    const uniqueIds = [...new Set(mapIds)];
    const maps = await Promise.all(uniqueIds.map((mapId) => repository.findMapById(mapId)));
    for (const map of maps) {
        if (!map) continue;
        runtime.emit(SocketEvent.MAP_UPDATED, {
            id: map.id,
            campaignId: map.campaignId,
            mapObjs: map.mapObjs,
        });
    }
}
