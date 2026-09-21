import { NextRequest } from "next/server";

import { CampaignController } from "../../controllers/CampaignController";

const controller = new CampaignController();

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const {id} = await params;
    return controller.delete(request, id);
}