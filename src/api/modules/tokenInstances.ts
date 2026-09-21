import { useEffect, useState } from "react";
import { api } from "../client";
import type { Token } from "../../types/token";
import { JsonTokenIntanceMapper, TokenInstaceMapper } from "../mappers/tokenInstanceMapper";
import type { Item } from "../../types/item";
import type { Card } from "../../types/card";

export class TokenInstanceAPI {

    // ===== BUSCAR INSTÂNCIAS DE TOKENS =====
    static async getTokensInstances(cards: Card[], items: Item[]): Promise<Token[]> {
        const json = await api<any[]>("/asset-library/tokens/list");
        return json.map(tokenJson => TokenInstaceMapper(tokenJson, cards, items));
    }

    // ===== CRIAR INSTÂNCIA DE TOKEN =====
    static async createTokenInstances(token: Token, mapId: string): Promise<Token> {
        const modifiedToken = { ...token }; // Evita mutar o objeto original diretamente

        // ====== MAPPER DE VALORES ====== //
        modifiedToken.lastDamagerId = "";
        modifiedToken.currentLife = 1;
        modifiedToken.maxLife = 1;
        modifiedToken.currentMana = 0;
        modifiedToken.maxMana = 0;
        modifiedToken.certaintyDiceRemaining = 0;
        modifiedToken.paralysisState = 'none';
        // ====== MAPPER DE VALORES ====== //

        const json = JsonTokenIntanceMapper(modifiedToken, mapId);

        console.info("Enviando para criação de instância:", json);

        return api<Token>("/asset-library/tokens/create", {
            method: "POST",
            body: JSON.stringify(json),
        });
    }

    // ===== ATUALIZAR INSTÂNCIA DE TOKEN =====
    static async updateTokenInstance(newToken: Token, mapId: string): Promise<Token> {
        try {
            const id = newToken.id;
            const modifiedToken = { ...newToken }; // Evita mutar o objeto original diretamente

            // ====== MAPPER DE VALORES ====== //
            // (Espaço reservado caso precise de mapeamentos futuros no update)
            // ====== MAPPER DE VALORES ====== //

            const json = JsonTokenIntanceMapper(modifiedToken, mapId);
            console.debug("Então isso chega até aqui?")
            return api<Token>(`/asset-library/tokens/${id}`, {
                method: "PATCH",
                body: JSON.stringify(json)
            });
        } catch (error) {
            console.error("UM ERRO OCORREU NA API: ", error)
            throw new Error("UM ERRO OCORREU NA API")
        }

    }

    // ===== DELETAR INSTÂNCIA DE TOKEN =====
    static async deleteTokenInstance(id: string): Promise<unknown> {
        return api<unknown>(`/asset-library/tokens/${id}`, {
            method: "DELETE",
        });
    }
}

// ===== CUSTOM HOOK (Mantido fora da classe seguindo as especificações do React) =====
export function useTokensInstances(cards: Card[], items: Item[]) {
    const [tokens, setTokens] = useState<Token[]>([]);

    useEffect(() => {
        TokenInstanceAPI.getTokensInstances(cards, items)
            .then((data) => {
                console.info("API retornou instâncias:", data);
                setTokens(data);
            })
            .catch((err) => {
                console.error("Erro ao buscar instâncias de tokens:", err);
            });
    }, [cards, items]);

    return tokens;
}