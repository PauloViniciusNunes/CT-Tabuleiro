import type { Item } from "./item";

type MapObjectType = "wall" | "chest" | "article" | "item";
type MapObjectPosition =
{
    col: number;
    row: number;
}

export type MapObject =
{
    type: MapObjectType;
    position: MapObjectPosition;
    imgUrl: string;
    itemRelative: Item | null;
}
