import { NextRequest, NextResponse } from "next/server";
import { CORS_HEADERS } from "@/shared/cors/headers";
import { getUser } from "@/shared/utils/getUser";
import { GetCampaignMapRoutingService } from "../services/GetCampaignMapRoutingService";
import { UpdateCampaignMemberMapService } from "../services/UpdateCampaignMemberMapService";

export class CampaignMapRoutingController {
    private readonly getCampaignMapRoutingService = new GetCampaignMapRoutingService();
    private readonly updateCampaignMemberMapService = new UpdateCampaignMemberMapService();

    async get(request: NextRequest, campaignId: string) {
        try {
            const user = await getUser(request);
            const routing = await this.getCampaignMapRoutingService.execute(user.id, campaignId);

            return NextResponse.json(routing, { headers: CORS_HEADERS });
        } catch (error) {
            return NextResponse.json(
                { error: error instanceof Error ? error.message : "Erro ao consultar direcionamento." },
                { status: 403, headers: CORS_HEADERS },
            );
        }
    }

    async update(request: NextRequest, campaignId: string) {
        try {
            const user = await getUser(request);
            const body = await request.json();
            const result = await this.updateCampaignMemberMapService.execute(user.id, campaignId, body);

            return NextResponse.json(result, { headers: CORS_HEADERS });
        } catch (error) {
            return NextResponse.json(
                { error: error instanceof Error ? error.message : "Erro ao direcionar jogadores." },
                { status: 400, headers: CORS_HEADERS },
            );
        }
    }
}
