import type { Item } from "../../types/item";
import type { MapObject } from "../../types/mapObject";

export function MapObjectMapper(value: unknown, items: readonly Item[]): MapObject {
  const object = value as Record<string, unknown>;
  const position = object.position && typeof object.position === "object"
    ? object.position as Record<string, unknown>
    : null;
  const itemRelativeId = typeof object.itemRelativeId === "string"
    ? object.itemRelativeId
    : null;

  return {
    id: String(object.id ?? ""),
    type: object.type as MapObject["type"],
    position: {
      col: Number(position?.col ?? object.col ?? 1),
      row: Number(position?.row ?? object.row ?? 1),
    },
    imgUrl: typeof object.imgUrl === "string" ? object.imgUrl : "",
    itemRelative: itemRelativeId
      ? items.find((item) => item.id === itemRelativeId) ?? null
      : null,
    itemRelativeId,
    linkedMapId: typeof object.linkedMapId === "string"
      ? object.linkedMapId
      : undefined,
    linkedDoorId: typeof object.linkedDoorId === "string"
      ? object.linkedDoorId
      : undefined,
  };
}
