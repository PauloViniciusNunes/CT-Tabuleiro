import type React from "react";
import type { Item } from "../types/item";
import type { Token } from "../types/token";
import type { SetStateAction } from "react";

export function haveSpaceInInventory(boardTokens: Token[], tokenId: string) // Função válida únicamente quando há apenas um token com ID único
{
    const token = boardTokens.find((t) => t.id === tokenId);

    if (!token) return false;

    const totalSpace = token.inventory.inventoryDimensions.cols * token.inventory.inventoryDimensions.rows;

    // É garantido que 'token.inventory.commonSlot?.length' será um number por causa do fluxo, porei o TS sempre avisa.
    return totalSpace - (token.inventory.commonSlot?.length ?? 0) > 0;
}

export function addItemToInventory(
    setBoardTokens: React.Dispatch<SetStateAction<Token[]>>,
    tokenId: string,
    item: Item
) {

    setBoardTokens(prev => {
        return prev.map(t => {
            if (t.id !== tokenId) return t;

            const inventory = t.inventory;

            const currentItems = inventory.commonSlot
                ? [...inventory.commonSlot] // garante nova referência
                : [];

            const totalSpace =
                inventory.inventoryDimensions.cols *
                inventory.inventoryDimensions.rows;

            if (currentItems.length >= totalSpace) return t;

            let updatedCommonSlot = [...currentItems];
            updatedCommonSlot.push(item);

            return {
                ...t,
                inventory: {
                    ...inventory,
                    commonSlot: updatedCommonSlot,
                },
            };
        });
    });

    setTimeout(() => {

    }, 100);

}