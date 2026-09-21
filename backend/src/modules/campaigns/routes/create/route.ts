import { NextRequest } from "next/server";

import { CampaignController } from "../../controllers/CampaignController";

const controller =
    new CampaignController();

export async function POST(request: NextRequest) {
    return controller.create(request);
}