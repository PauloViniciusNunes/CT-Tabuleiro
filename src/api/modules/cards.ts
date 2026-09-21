import type { Card } from "../../types/card";
import { useEffect, useState } from "react";
import { api } from "../client";
import { CardMapper, JsonCardMapper } from "../mappers/cardMapper";

export class CardAPI {

    // ===== BUSCAR CARDS =====
    static async getCards(): Promise<Card[]> {
        const json = await api<unknown[]>("/cards/list");
        return json.map(cardJson => CardMapper(cardJson));
    }

    // ===== CRIAR CARD =====
    static async createCard(card: Card): Promise<Card> {
        const json = JsonCardMapper(card);

        console.info("Enviando para criação de card:", json);

        const createdCard = await api<unknown>("/cards/create", {
            method: "POST",
            body: JSON.stringify(json),
        });
        return CardMapper(createdCard);
    }

    // ===== ATUALIZAR CARD =====
    static async updateCard(newCard: Card): Promise<Card> {
        const id = newCard.id;
        const json = JsonCardMapper(newCard);

        const updatedCard = await api<unknown>(`/cards/${id}`, {
            method: "PATCH",
            body: JSON.stringify(json)
        });
        return CardMapper(updatedCard);
    }

    // ===== DELETAR CARD =====
    static async deleteCard(id: string): Promise<unknown> {
        return api<unknown>(`/cards/${id}`, {
            method: "DELETE",
        });
    }
}

// ===== CUSTOM HOOK (Mantido fora da classe seguindo as especificações do React) =====
export function useCards() {
    const [cards, setCards] = useState<Card[]>([]);

    useEffect(() => {
        CardAPI.getCards()
            .then((data) => {
                console.info("API retornou cards:", data);
                setCards(data);
            })
            .catch((err) => {
                console.error("Erro ao buscar cards:", err);
            });
    }, []);

    return cards;
}
