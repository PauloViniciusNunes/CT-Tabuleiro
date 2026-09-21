import type { Item } from "../../types/item";
import { useEffect, useState } from "react";
import { api } from "../client";
import { ItemMapper, JsonItemMapper } from "../mappers/itemMapper";
import type { Card } from "../../types/card";

export class ItemAPI {

    // ===== BUSCAR ITENS =====
    static async getItems(cards: Card[]): Promise<Item[]> {
        const json = await api<unknown[]>("/items/list");
        return json.map((itemJson) => ItemMapper(itemJson, cards));
    }

    // ===== CRIAR ITEM =====
    static async createItem(item: Item, cards: Card[] = []): Promise<Item> {
        const json = JsonItemMapper(item);

        console.info("Enviando para criação de item:", json);

        const createdItem = await api<unknown>("/items/create", {
            method: "POST",
            body: JSON.stringify(json),
        });
        return ItemMapper(createdItem, cards);
    }

    // ===== ATUALIZAR ITEM =====
    static async updateItem(newItem: Item, cards: Card[] = []): Promise<Item> {
        const id = newItem.id;
        const json = JsonItemMapper(newItem);

        const updatedItem = await api<unknown>(`/items/${id}`, {
            method: "PATCH",
            body: JSON.stringify(json)
        });
        return ItemMapper(updatedItem, cards);
    }

    // ===== DELETAR ITEM =====
    static async deleteItem(id: string): Promise<unknown> {
        return api<unknown>(`/items/${id}`, {
            method: "DELETE",
        });
    }
}

// ===== CUSTOM HOOK (Mantido fora da classe seguindo as especificações do React) =====
export function useItems(cards: Card[] = []) {
    const [items, setItems] = useState<Item[]>([]);

    useEffect(() => {
        let isCurrentRequest = true;

        ItemAPI.getItems(cards)
            .then((data) => {
                if (!isCurrentRequest) return;
                console.info("API retornou itens:", data);
                setItems(data);
            })
            .catch((err) => {
                if (!isCurrentRequest) return;
                console.error("Erro ao buscar itens:", err);
            });

        return () => {
            isCurrentRequest = false;
        };
    }, [cards]);

    return items;
}
