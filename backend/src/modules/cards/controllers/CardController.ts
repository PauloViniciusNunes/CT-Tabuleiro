import { NextRequest, NextResponse } from "next/server";

import { getUser } from "@/shared/utils/getUser";

import { CreateCardService } from "../services/CreateCardService";
import { DeleteCardService } from "../services/DeleteCardService";
import { GetCardByIdService } from "../services/GetCardByIdService";
import { GetCardsService } from "../services/GetCardsService";
import { UpdateCardService } from "../services/UpdateCardService";
import { CORS_HEADERS } from "@/shared/cors/headers";

export class CardController {

    private readonly createCardService = new CreateCardService();
    private readonly getCardsService = new GetCardsService();
    private readonly getCardByIdService = new GetCardByIdService();
    private readonly updateCardService = new UpdateCardService();
    private readonly deleteCardService = new DeleteCardService();

    async create(request: NextRequest) {

        try {

            const user =
                await getUser(request);

            const body =
                await request.json();

            const tokenId = await request.headers.get("token")

            const card =
                await this.createCardService.execute(
                    user.id,
                    tokenId ?? "",
                    body,
                );

            return NextResponse.json(
                card,
                {
                    status: 201,
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

            const user =
                await getUser(request);

            const cards =
                await this.getCardsService.execute(
                    user.id,
                );

            return NextResponse.json(cards, {
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

            const user =
                await getUser(request);

            const card =
                await this.getCardByIdService.execute(
                    user.id,
                    id,
                );

            return NextResponse.json(card, {
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

            const user =
                await getUser(request);

            const body =
                await request.json();

            const card =
                await this.updateCardService.execute(
                    user.id,
                    id,
                    body,
                );

            return NextResponse.json(card, {
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

            console.log("Chegou aqui")

            const user =
                await getUser(request);

            await this.deleteCardService.execute(
                user.id,
                id,
            );

            return NextResponse.json({
                message: "Card removido com sucesso.",
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