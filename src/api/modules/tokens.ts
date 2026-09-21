import { useEffect, useState } from "react";
import { api } from "../client";
import type { Token } from "../../types/token";
import { JsonTokenMapper, TokenMapper } from "../mappers/tokenMapper";
import type { Item } from "../../types/item";
import type { Card } from "../../types/card";

export class TokenAPI {
    
    // ===== BUSCAR TOKENS =====
    static async getTokens(cards: Card[], items: Item[], campaignId: string | undefined): Promise<Token[]> {

        // CRIAR O PACOTE COM O ID DA CAMPANHA
        if(!campaignId) {
            return []
        }

        const packet = {
            campaignId: campaignId
        }

        const json = await api<unknown[]>("/tokens/list", {
            method: "POST",
            body: JSON.stringify(packet)
        });
        return json.map(tokenJson => TokenMapper(tokenJson, cards, items));
    }

    // ===== CRIAR TOKEN =====
    static async createToken(
        token: Token,
        cards: Card[] = [],
        items: Item[] = [],
    ): Promise<Token> {
        const json = JsonTokenMapper(token);

        console.info("Enviando para criação:", json);

        const createdToken = await api<unknown>("/tokens/create", {
            method: "POST",
            body: JSON.stringify(json),
        });

        return TokenMapper(createdToken, cards, items);
    }

    // ===== ATUALIZAR TOKEN =====
    static async updateToken(
        newToken: Token,
        cards: Card[] = [],
        items: Item[] = [],
    ): Promise<Token> {
        const id = newToken.id;
        const json = JsonTokenMapper(newToken);

        const updatedToken = await api<unknown>(`/tokens/${id}`, {
            method: "PATCH",
            body: JSON.stringify(json)
        });
        return TokenMapper(updatedToken, cards, items);
    }

    // ===== DELETAR TOKEN =====
    static async deleteToken(id: string): Promise<unknown> {
        return api<unknown>(`/tokens/${id}`, {
            method: "DELETE",
        });
    }
}

// ===== CUSTOM HOOK (Mantido fora da classe seguindo as especificações do React) =====
export function useTokens(
    cards: Card[],
    items: Item[],
    campaignId: string | undefined,
    refreshKey = 0,
) {
    const [tokens, setTokens] = useState<Token[]>([]);

    useEffect(() => {
        let isCurrentRequest = true;

        TokenAPI.getTokens(cards, items, campaignId)
            .then((data) => {
                if (!isCurrentRequest) return;
                console.info("API retornou:", data);
                setTokens(data);
            })
            .catch((err) => {
                if (!isCurrentRequest) return;
                console.error("Erro ao buscar tokens:", err);
            });

        return () => {
            isCurrentRequest = false;
        };
    }, [cards, items, campaignId, refreshKey]);

    return tokens;    
}
