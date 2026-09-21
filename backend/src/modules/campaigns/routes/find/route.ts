import { NextRequest } from "next/server";
import { CampaignController } from "../../controllers/CampaignController";

const controller = new CampaignController();

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    return controller.findCampaign(request, id);
}