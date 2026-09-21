import { NextRequest, NextResponse } from "next/server";

import { getUser } from "@/shared/utils/getUser";

import { CreateTokenService } from "../services/CreateTokenService";
import { DeleteTokenService } from "../services/DeleteTokenService";
import { GetTokenByIdService } from "../services/GetTokenByIdService";
import { GetTokensService } from "../services/GetTokensService";
import { UpdateTokenService } from "../services/UpdateTokenService";
import { CreateTokenValidator } from "../validators/CreateTokenValidator";
import { CORS_HEADERS } from "@/shared/cors/headers";
import { CampaignIdValidator } from "../validators/CampaignIdValidator";

export class TokenController {
    private readonly createTokenService = new CreateTokenService();
    private readonly getTokensService = new GetTokensService();
    private readonly getTokenByIdService = new GetTokenByIdService();
    private readonly updateTokenService = new UpdateTokenService();
    private readonly deleteTokenService = new DeleteTokenService();

    async create(request: NextRequest) {
        try {
            const user = await getUser(request);
            const body = await request.json();

            // 1. Valida o body vindo do Front-end
            const validatedBody = CreateTokenValidator.parse(body);

            console.log("AUTH USER ID:", user.id);
            console.log("BODY USER ID:", validatedBody.userId);

            // 2. Passa os dados validados para o Service
            const token = await this.createTokenService.execute(validatedBody);

            const { imageUrl, ...treatToken } = token;

            console.log("[TOKEN CRIADO]: ", treatToken);

            return NextResponse.json(token, {
                status: 201,
                headers: CORS_HEADERS,
            });
        } catch (error) {
            console.warn(error);
            return this.error(error);
        }
    }

    async list(request: NextRequest) {
        try {
            const user = await getUser(request);
            const mapId = request.nextUrl.searchParams.get("mapId");
            const body = await request.json()

            // //
            const campaignPackage = CampaignIdValidator.parse(body)

            if(!campaignPackage) {
                throw new Error("Campaign Package veio em formato indesejado.")
            }

            const campaignId = campaignPackage.campaignId;

            if(!campaignId) {
                throw new Error("Não foi encontrado nenhum campaignId.")
            }

            const tokens = await this.getTokensService.execute(campaignId, user.id, mapId);

            return NextResponse.json(tokens, {
                headers: CORS_HEADERS,
            });
        } catch (error) {
            console.error(error)
            return this.error(error);
        }
    }

    async get(
        request: NextRequest,
        id: string,
    ) {
        try {
            const user = await getUser(request);
            const token = await this.getTokenByIdService.execute(user.id, id);

            return NextResponse.json(token, {
                headers: CORS_HEADERS,
            });
        } catch (error) {
            console.error(error)
            return this.error(error);
        }
    }

    async update(
        request: NextRequest,
        id: string,
    ) {
        try {
            const user = await getUser(request);
            const body = await request.json();
            const token = await this.updateTokenService.execute(user.id, id, body);

            return NextResponse.json(token, {
                headers: CORS_HEADERS,
            });
        } catch (error) {
            return this.error(error);
        }
    }

    async delete(
        request: NextRequest,
        id: string,
    ) {
        try {
            const user = await getUser(request);

            await this.deleteTokenService.execute(user.id, id);

            return NextResponse.json({
                message: "Token removido com sucesso.",
                headers: CORS_HEADERS,
            });
        } catch (error) {
            console.error(error)
            return this.error(error);
        }
    }

    private error(error: unknown) {
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : "Erro interno",
            },
            { status: 400 },
        );
    }
}
