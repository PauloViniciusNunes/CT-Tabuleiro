import type { Item } from "./item";

type MapObjectType = "wall" | "chest" | "article" | "item" | "door";
type MapObjectPosition =
{
    col: number;
    row: number;
}

export type MapObject = {
  id: string;
  type: MapObjectType;
  position: MapObjectPosition;
  imgUrl: string;
  itemRelative: Item | null;
  // 🔥 DOORS
  linkedMapId?: string;
  linkedDoorId?: string;
}