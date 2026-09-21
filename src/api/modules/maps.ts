import { useEffect, useState } from "react";
import { api } from "../client";
import type { Mapa } from "../../types/mapas";
import { JsonMapMapper, MapMapper } from "../mappers/mapMapper";
import type { Card } from "../../types/card";
import type { Item } from "../../types/item";

export class MapaAPI {

    // ===== BUSCAR MAPAS =====
    static async getMaps(cards: Card[], items: Item[]): Promise<Mapa[]> {
        const urlParams = new URLSearchParams(window.location.search);
        const campaignId = urlParams.get("campaignId");

        if (!campaignId) {
            throw new Error("ID da campanha não foi fornecido na URL.");
        }

        const json = await api<any[]>(`/maps/list/${campaignId}`);
        return json.map((j) => MapMapper(j, cards, items));
    }

    // ===== CRIAR MAPA =====
    static async createMaps(map: Mapa): Promise<Mapa> {
        const modifiedMapa = { ...map }; // Evita mutar o objeto original diretamente

        const urlParams = new URLSearchParams(window.location.search);
        const campaignId = urlParams.get("campaignId");

        // ====== MAPPER DE VALORES ====== //
        modifiedMapa.campaignId = campaignId ?? ""
        // ====== MAPPER DE VALORES ====== //

        const json = JsonMapMapper(modifiedMapa);

        console.info("Enviando para criação de mapa:", json);

        return api<Mapa>("/maps/create", {
            method: "POST",
            body: JSON.stringify(json),
        });
    }

    // ===== ATUALIZAR MAPA =====
    static async updateMaps(map: Mapa): Promise<Mapa> {
        const id = map.id;
        const modifiedMapa = { ...map }; // Evita mutar o objeto original diretamente

        const urlParams = new URLSearchParams(window.location.search);
        const campaignId = urlParams.get("campaignId");

        if (!campaignId) {
            throw new Error("ID da campanha não foi fornecido na URL.");
        }

        // ====== MAPPER DE VALORES ====== //
        // (Espaço reservado caso precise de mapeamentos futuros)
        // ====== MAPPER DE VALORES ====== //

        const json = JsonMapMapper(modifiedMapa);

        console.info("Enviando para atualização de mapa:", json);

        // ID de sessão/campanha mantido estático conforme o seu código original
        return api<Mapa>(`/maps/update/${campaignId}/${id}`, {
            method: "PATCH",
            body: JSON.stringify(json),
        });    
    }
}

// ===== CUSTOM HOOK (Mantido fora da classe seguindo as especificações do React) =====
export function useMaps(cards: Card[], items: Item[]) {
    const [maps, setMaps] = useState<Mapa[]>([]);

    useEffect(() => {
        MapaAPI.getMaps(cards, items)
            .then((data) => {
                console.info("API retornou mapas:", data);
                setMaps(data);
            })
            .catch((err) => {
                console.error("Erro ao buscar mapas:", err);
            });
    }, [cards, items]); // ✅ Adicionado cards e items nas dependências para evitar race conditions!

    return maps;
}