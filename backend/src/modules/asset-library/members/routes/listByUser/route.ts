import { NextRequest } from "next/server";

import { CampaignMemberController } from "../../controllers/CampaignMemberController";

const controller = new CampaignMemberController()

export async function POST(request: NextRequest) {
    return await controller.listByUser(request)
}

