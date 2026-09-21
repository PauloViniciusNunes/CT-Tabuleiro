import { NextRequest, NextResponse } from "next/server";

import { getUser } from "@/shared/utils/getUser";

import { CreateItemService } from "../services/CreateItemService";
import { DeleteItemService } from "../services/DeleteItemService";
import { GetItemByIdService } from "../services/GetItemByIdService";
import { GetItemsService } from "../services/GetItemsService";
import { UpdateItemService } from "../services/UpdateItemService";
import { CORS_HEADERS } from "@/shared/cors/headers";

export class ItemController {

    private readonly createItemService = new CreateItemService();
    private readonly getItemsService = new GetItemsService();
    private readonly getItemByIdService = new GetItemByIdService();
    private readonly updateItemService = new UpdateItemService();
    private readonly deleteItemService = new DeleteItemService();

    async create(request: NextRequest) {

        try {

            const user =
                await getUser(request);

            const body =
                await request.json();

            const tokenId = await request.headers.get("token")

            const item =
                await this.createItemService.execute(
                    user.id,
                    tokenId,
                    body,
                );

            return NextResponse.json(
                item,
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

            const items =
                await this.getItemsService.execute(
                    user.id,
                );

            return NextResponse.json(items, {
                headers: CORS_HEADERS
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

            const user =
                await getUser(request);

            const item =
                await this.getItemByIdService.execute(
                    user.id,
                    id,
                );

            return NextResponse.json(item, {
                headers: CORS_HEADERS
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

            const user =
                await getUser(request);

            const body =
                await request.json();

            const item =
                await this.updateItemService.execute(
                    user.id,
                    id,
                    body,
                );

            return NextResponse.json(item, {
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

            const user =
                await getUser(request);

            await this.deleteItemService.execute(
                user.id,
                id,
            );

            return NextResponse.json({
                message: "Item removido com sucesso.",
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