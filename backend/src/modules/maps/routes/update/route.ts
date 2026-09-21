import { NextRequest } from "next/server";

import { MapController } from "../../controllers/MapController";

const controller = new MapController()

export async function PATCH(request: NextRequest, {params}: {params: Promise<{ campaignId: string, mapId: string }>})
{
    const {campaignId, mapId} = await params
    return controller.update(request,campaignId,mapId)
}