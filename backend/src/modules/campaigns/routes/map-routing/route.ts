import { NextRequest } from "next/server";
import { CampaignMapRoutingController } from "../../controllers/CampaignMapRoutingController";

const controller = new CampaignMapRoutingController();

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id } = await params;
    return controller.get(request, id);
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id } = await params;
    return controller.update(request, id);
}
