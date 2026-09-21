// src/modules/cards/routes/get/route.ts

import { NextRequest } from "next/server";

import { CardController } from "../../controllers/CardController";

const controller = new CardController();

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id } = await params;

    return controller.get(request, id);
}