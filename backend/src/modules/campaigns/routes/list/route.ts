import { NextRequest } from "next/server";

import { CampaignController } from "../../controllers/CampaignController";

const controller = new CampaignController();

export async function GET(request: NextRequest) {
    return controller.list(request);
}