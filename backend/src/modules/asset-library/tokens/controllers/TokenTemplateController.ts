import { NextRequest, NextResponse } from "next/server";

import { getUser } from "@/shared/utils/getUser";

import { CreateTokenTemplateService } from "../services/CreateTokenTemplateService";
import { DeleteTokenTemplateService } from "../services/DeleteTokenTemplateService";
import { GetTokenTemplateByIdService } from "../services/GetTokenTemplateByIdService";
import { GetTokenTemplatesService } from "../services/GetTokenTemplatesService";
import { UpdateTokenTemplateService } from "../services/UpdateTokenTemplateService";
import { CORS_HEADERS } from "@/shared/cors/headers";

export class TokenTemplateController {

    private readonly createTokenTemplateService = new CreateTokenTemplateService();
    private readonly getTokenTemplatesService = new GetTokenTemplatesService();
    private readonly getTokenTemplateByIdService = new GetTokenTemplateByIdService();
    private readonly updateTokenTemplateService = new UpdateTokenTemplateService();
    private readonly deleteTokenTemplateService = new DeleteTokenTemplateService();


    async create(request: NextRequest) {

        try {

            const body = await request.json();

            console.log(body)

            const tokenTemplate =
                await this.createTokenTemplateService.execute(
                    body,
                );

            return NextResponse.json(
                tokenTemplate,
                {
                    status: 200,
                    headers: CORS_HEADERS
                },
            );

        } catch (error) {
            console.error(error)
            return this.error(error);
        }

    }

    async list(request: NextRequest) {

        try {

            const user = await getUser(request);

            const tokenTemplates =
                await this.getTokenTemplatesService.execute(
                    user.id,
                );

            return NextResponse.json(tokenTemplates, {
                status: 200,
                headers: CORS_HEADERS
            });

        } catch (error) {
            return this.error(error);
        }

    }

    async get(
        request: NextRequest,
        id: string,
    ) {

        try {

            const user = await getUser(request);

            const tokenTemplate =
                await this.getTokenTemplateByIdService.execute(
                    user.id,
                    id,
                );

            return NextResponse.json(tokenTemplate, {
                status: 200,
                headers: CORS_HEADERS
            });

        } catch (error) {
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

            const tokenTemplate =
                await this.updateTokenTemplateService.execute(
                    user.id,
                    id,
                    body,
                );

            return NextResponse.json(tokenTemplate, {
                status: 200,
                headers: CORS_HEADERS
            });

        } catch (error) {
            console.error(error)
            return this.error(error);
        }

    }

    async delete(
        request: NextRequest,
        id: string,
    ) {

        try {

            const user = await getUser(request);

            await this.deleteTokenTemplateService.execute(
                user.id,
                id,
            );

            return NextResponse.json(
                { message: "Token Instance deletado com sucesso" },
                {
                    status: 200,
                    headers: CORS_HEADERS
                });

        } catch (error) {
            console.error(error)
            return this.error(error);
        }

    }


    private error(error: unknown) {

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