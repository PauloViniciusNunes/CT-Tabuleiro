import { NextRequest, NextResponse } from "next/server";

import { AddMemberCampaignService } from "../services/AddMemberCampaignService";
import { CheckIsMemberService } from "../services/CheckIsMemberService";
import { FindByCampaignAndUserService } from "../services/FindByCampaignAndUserService";
import { ListCampaignsByUserIdService } from "../services/ListCampaignsByUserIdService";
import { ListMembersByCampaignIdService } from "../services/ListMembersByCampaignIdService";
import { RemoveMemberCampaignService } from "../services/RemoveMemberCampaignService";

import { getUser } from "@/shared/utils/getUser";
import { CORS_HEADERS } from "@/shared/cors/headers";

export class CampaignMemberController {

    private readonly addMemberCampaignService = new AddMemberCampaignService()
    private readonly checkIsMemberService = new CheckIsMemberService()
    private readonly findByCampaignAndUserService = new FindByCampaignAndUserService()
    private readonly listCampaignsByUserIdService = new ListCampaignsByUserIdService()
    private readonly listMembersByCampaignIdService = new ListMembersByCampaignIdService()
    private readonly removeMemberCampaignService = new RemoveMemberCampaignService()


    async add(request: NextRequest) {
        try {
            const user = await getUser(request)
            const body = await request.json()
            const added = await this.addMemberCampaignService.execute(body)
            return NextResponse.json(added, {
                status: 200,
                headers: CORS_HEADERS
            })
        } catch (error) {
            console.error(error)
            return NextResponse.json({
                message: error
            }, {
                status: 400
            })
        }
    }

    async check(request: NextRequest) {
        try {
            const user = await getUser(request)
            const body = await request.json()
            const checked = await this.checkIsMemberService.execute(body)
            return NextResponse.json(checked, {
                status: 200,
                headers: CORS_HEADERS
            })
        } catch (error) {
            console.error(error)
            return NextResponse.json({
                message: error
            }, {
                status: 400
            })
        }
    }

    async findByCampaignAndUser(request: NextRequest) {
        try {
            const user = await getUser(request)
            const body = await request.json()
            const finded = await this.findByCampaignAndUserService.execute(body)
            return NextResponse.json(finded, {
                status: 200,
                headers: CORS_HEADERS
            })
        } catch (error) {
            console.error(error)
            return NextResponse.json({
                message: error
            }, {
                status: 400
            })
        }
    }

    async listByUser(request: NextRequest) {
        try {
            const user = await getUser(request)
            const body = await request.json()
            const listed = await this.listCampaignsByUserIdService.execute(body)
            return NextResponse.json(listed, {
                status: 200,
                headers: CORS_HEADERS
            })
        } catch (error) {
            console.error(error)
            return NextResponse.json({
                message: error
            }, {
                status: 400
            })
        }
    }

    async listByCampaign(request: NextRequest) {
        try {
            const user = await getUser(request)
            const body = await request.json()
            const listed = await this.listMembersByCampaignIdService.execute(body)
            return NextResponse.json(listed, {
                status: 200,
                headers: CORS_HEADERS
            })
        } catch (error) {
            console.error(error)
            return NextResponse.json({
                message: error
            })
        }
    }

    async remove(request: NextRequest) {
        try {
            const user = await getUser(request)
            const body = await request.json()
            await this.removeMemberCampaignService.execute(body)
            return NextResponse.json({
                message: "Membro de campanha removido com sucesso!"
            }, {
                status: 200,
                headers: CORS_HEADERS
            })
        } catch (error) {
            console.error(error)
            return NextResponse.json({
                message: error
            }, {
                status: 400
            })
        }
    }

}