import { NextRequest } from "next/server";

import { MapController } from "../../controllers/MapController";

import { CORS_HEADERS } from "@/shared/cors/headers";

const controller = new MapController();

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> })
{
    const {id} = await params;
    return controller.list(request, id);
}

export async function OPTIONS() {

    return new Response(null, {
        status: 210,
        headers: CORS_HEADERS,
    });
}