import { api } from "../client";

export type MapObjectKind = "wall" | "chest" | "article" | "door";

export interface MapObjectWriteCommand {
  type: MapObjectKind;
  row: number;
  col: number;
  imgUrl: string;
  itemRelativeId?: string | null;
  linkedMapId?: string | null;
}

export interface RawMapObjectMutation {
  mapObject: Record<string, unknown> | null;
  maps: Array<{
    mapId: string;
    mapObjects: Array<Record<string, unknown>>;
  }>;
}

export class MapObjectAPI {
  static list(mapId: string) {
    return api<Array<Record<string, unknown>>>(`/maps/${mapId}/objects`);
  }

  static create(mapId: string, command: MapObjectWriteCommand) {
    return api<RawMapObjectMutation>(`/maps/${mapId}/objects`, {
      method: "POST",
      body: JSON.stringify(command),
    });
  }

  static update(
    mapId: string,
    objectId: string,
    command: Partial<MapObjectWriteCommand>,
  ) {
    return api<RawMapObjectMutation>(`/maps/${mapId}/objects/${objectId}`, {
      method: "PATCH",
      body: JSON.stringify(command),
    });
  }

  static delete(mapId: string, objectId: string) {
    return api<RawMapObjectMutation>(`/maps/${mapId}/objects/${objectId}`, {
      method: "DELETE",
    });
  }

  static clear(mapId: string) {
    return api<RawMapObjectMutation>(`/maps/${mapId}/objects`, {
      method: "DELETE",
    });
  }

  static createWalls(
    mapId: string,
    walls: readonly { row: number; col: number; imgUrl: string }[],
  ) {
    return api<RawMapObjectMutation>(`/maps/${mapId}/objects/walls`, {
      method: "POST",
      body: JSON.stringify({ walls }),
    });
  }

  static paint(mapId: string, objects: readonly MapObjectWriteCommand[]) {
    return api<RawMapObjectMutation>(`/maps/${mapId}/objects/paint`, {
      method: "POST",
      body: JSON.stringify({ objects }),
    });
  }

  static erase(
    mapId: string,
    positions: readonly { row: number; col: number }[],
  ) {
    return api<RawMapObjectMutation>(`/maps/${mapId}/objects/paint`, {
      method: "DELETE",
      body: JSON.stringify({ positions }),
    });
  }
}
