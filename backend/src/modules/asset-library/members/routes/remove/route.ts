import { NextRequest } from "next/server";

import { CampaignMemberController } from "../../controllers/CampaignMemberController";

const controller = new CampaignMemberController()

export async function DELETE(request: NextRequest) {
    return await controller.remove(request)
}

