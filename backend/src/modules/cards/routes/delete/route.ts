// src/modules/cards/routes/delete/route.ts

import { NextRequest } from "next/server";

import { CardController } from "../../controllers/CardController";

const controller = new CardController();

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id } = await params;

    return controller.delete(request, id);
}