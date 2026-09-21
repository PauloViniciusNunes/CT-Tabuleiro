import { NextRequest, NextResponse } from "next/server";

import { CreateCampaignService } from "../services/CreateCampaignService";
import { GetCampaignsService } from "../services/GetCampaignsService";
import { GetCampaignByIdService } from "../services/GetCampaignByIdService";
import { UpdateCampaignService } from "../services/UpdateCampaignService";
import { DeleteCampaignService } from "../services/DeleteCampaignService";

import { getUser } from "@/shared/utils/getUser";
import { CORS_HEADERS } from "@/shared/cors/headers";

export class CampaignController {

    private readonly createCampaignService = new CreateCampaignService();
    private readonly getCampaignsService = new GetCampaignsService();
    private readonly getCampaignByIdService = new GetCampaignByIdService();
    private readonly updateCampaignService = new UpdateCampaignService();
    private readonly deleteCampaignService = new DeleteCampaignService();

    async create(request: NextRequest) {

        try {
            const user = await getUser(request);

            const body = await request.json();

            const campaign = await this.createCampaignService.execute(user.id, body,);

            return NextResponse.json(campaign,
                {
                    status: 201,
                    headers: CORS_HEADERS,
                },
            );

        } catch (error) {
            console.error(error)
            return NextResponse.json(error, {
                status: 400
            })
        }


    }

    async list(request: NextRequest) {

        try {

            const user = await getUser(request);

            const campaigns = await this.getCampaignsService.execute(user.id);

            return NextResponse.json(campaigns, {
                headers: CORS_HEADERS,
            });

        } catch (error) {

            return NextResponse.json(
                {
                    error:
                        error instanceof Error
                            ? error.message
                            : "Erro interno",
                },
                { status: 400 }
            );

        }

    }

    async findCampaign(
        request: NextRequest,
        id: string,
    ) {

        await getUser(request);

        const campaign =
            await this.getCampaignByIdService.execute(id);

        return NextResponse.json(campaign, {
            headers: CORS_HEADERS,
        });
    }

    async update(
        request: NextRequest,
        id: string,
    ) {

        try {

            const user =
                await getUser(request);

            const body =
                await request.json();

            const campaign =
                await this.updateCampaignService.execute(
                    user.id,
                    id,
                    body,
                );

            return NextResponse.json(campaign, {
                headers: CORS_HEADERS,
            });

        } catch (error) {

            return NextResponse.json(
                {
                    error:
                        error instanceof Error
                            ? error.message
                            : "Erro interno",
                },
                {
                    status: 400,
                },
            );

        }

    }

    async delete(
        request: NextRequest,
        id: string
    ) {
        try {
            const user = await getUser(request)
            await this.deleteCampaignService.execute(user.id, id);


            return NextResponse.json({
                message: "Campanha removida com sucesso.",
                headers: CORS_HEADERS,
            });
        }
        catch (error) {
            return NextResponse.json(
                {
                    error:
                        error instanceof Error
                            ? error.message
                            : "Erro interno",
                },
                {
                    status: 400,
                },
            );
        }
    }

}