import { NextRequest, NextResponse } from "next/server";

import { CreateTokenCardService } from "../services/CreateTokenCardService";
import { DeleteTokenCardService } from "../services/DeleteTokenCardService";
import { GetTokenCardsService } from "../services/GetTokenCardsService";
import { GetTokenCardByIdService } from "../services/GetTokenCardByIdService";
import { UpdateTokenCardService } from "../services/UpdateTokenCardService";
import { CORS_HEADERS } from "@/shared/cors/headers";

export class TokenCardController {
    private readonly createTokenCardService = new CreateTokenCardService()
    private readonly deleteTokenCardService = new DeleteTokenCardService()
    private readonly getTokenCardService = new GetTokenCardsService()
    private readonly getTokenCardByIdService = new GetTokenCardByIdService()
    private readonly updateTokenCardService = new UpdateTokenCardService()

    async create(request: NextRequest) {
        try {
            const body = await request.json()
            const tokenCard = await this.createTokenCardService.execute(body)
            return NextResponse.json(tokenCard, {
                headers: CORS_HEADERS
            })
        }
        catch (error) {
            return NextResponse.json({
                message: error
            })
        }
    }

    async delete(id: string) {
        try {
            const delTokenCard = await this.deleteTokenCardService.execute(id)

            return NextResponse.json(delTokenCard, {
                headers: CORS_HEADERS
            })
        }
        catch (error) {
            return NextResponse.json({
                message: error
            })
        }
    }

    async get(request: NextRequest) {
        try {
            const body = await request.json()
            const id = body.tokenId
            const gets = await this.getTokenCardService.execute(id)
            return NextResponse.json(gets, {
                headers: CORS_HEADERS
            })
        }
        catch (error) {
            return NextResponse.json({
                message: error
            })
        }
    }

    async find(id: string) {
        try {
            const tokenCard = await this.getTokenCardByIdService.execute(id)
            return NextResponse.json(tokenCard,{
                headers: CORS_HEADERS
            })
        }
        catch (error) {
            return NextResponse.json({
                message: error
            })
        }
    }

    async update(request: NextRequest, id: string) {
        try {
            const body = await request.json()
            const update = await this.updateTokenCardService.execute(id, body)
            return NextResponse.json(update, {
                headers: CORS_HEADERS
            })
        } 
        catch (error) {
            return NextResponse.json({
                message: error
            })            
        }
    }
}