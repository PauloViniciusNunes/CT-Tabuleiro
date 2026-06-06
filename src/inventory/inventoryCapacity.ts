import type { EngineContext } from "../types/BoardEngineContext";
import type { Item } from "../types/item";

export function haveSpaceInInventory(context: EngineContext, tokenId: string) // Função válida únicamente quando há apenas um token com ID único
{
    const token = context.boardTokens.find((t) => t.id === tokenId);

    if (!token) return false;

    const totalSpace = token.inventory.inventoryDimensions.cols * token.inventory.inventoryDimensions.rows;

    // É garantido que 'token.inventory.commonSlot?.length' será um number por causa do fluxo, porei o TS sempre avisa.
    return totalSpace - (token.inventory.commonSlot?.length ?? 0) > 0;
}

export function addItemToInventory(
    context: EngineContext,
    tokenId: string,
    item: Item
) {

    context.setBoardTokens(prev => {
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