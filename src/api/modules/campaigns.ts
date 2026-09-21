import { api } from "../client";
import type { Campaign, CampaignMapRouting } from "../../types/campaign";

export class CampaignAPI {

    static async create(campaign: Campaign): Promise<Campaign> {
        return await api<Campaign>('/campaigns/create', {
            method: "POST",
            body: JSON.stringify(campaign)
        });
    }

    static async list() {
        return await api<unknown[]>('/campaigns/list');
    }

    static async getCampaign(id: string) {
        return await api<unknown>(`/campaigns/${id}`, {
            method: 'GET'
        })
    }

    static async getMapRouting(campaignId: string): Promise<CampaignMapRouting> {
        return api<CampaignMapRouting>(`/campaigns/${campaignId}/map-routing`);
    }

    static async directMembersToMap(
        campaignId: string,
        mapId: string,
        userIds: string[],
    ): Promise<{ campaignId: string; mapId: string; userIds: string[] }> {
        return api(`/campaigns/${campaignId}/map-routing`, {
            method: "PATCH",
            body: JSON.stringify({ mapId, userIds }),
        });
    }

    static async addAsMember(campaignId: string, userId: string) {
        const pack = {
            campaignId,
            userId
        };

        return await api<unknown>(`/asset-library/members/add`, {
            method: "POST",
            body: JSON.stringify(pack)
        });
    }    

    static async removeMember(campaignId: string, userId: string) {
        const pack = {
            campaignId,
            userId
        };

        return await api<unknown>(`/asset-library/members/remove`, {
            method: "DELETE",
            body: JSON.stringify(pack)
        });
    }

    static async find(campaignId: string, userId: string) {
        const pack = {
            campaignId,
            userId
        };

        return await api<unknown>(`/asset-library/members/find`, {
            method: "POST",
            body: JSON.stringify(pack)
        });
    }

    // 🟢 CORRIGIDO: Envia { userId } como objeto
    static async listByUser(userId: string) {
        return await api<unknown[]>(`/asset-library/members/listByUser`, {
            method: "POST",
            body: JSON.stringify({ userId })
        });
    }

    // 🟢 CORRIGIDO: Envia { campaignId } como objeto
    static async listByCampaign(campaignId: string) {
        return await api<unknown[]>(`/asset-library/members/listByCampaign`, {
            method: "POST",
            body: JSON.stringify({ campaignId })
        });
    }   
    
    static async checkIsMember(campaignId: string, userId: string) {
        const pack = {
            campaignId,
            userId
        };        

        return await api<unknown>(`/asset-library/members/check`, {
            method: "POST",
            body: JSON.stringify(pack)
        });
    }
}
