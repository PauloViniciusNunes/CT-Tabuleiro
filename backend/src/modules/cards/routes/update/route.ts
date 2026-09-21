// src/modules/cards/routes/update/route.ts

import { NextRequest } from "next/server";

import { CardController } from "../../controllers/CardController";

const controller = new CardController();

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id } = await params;

    return controller.update(request, id);
}