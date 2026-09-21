// src/modules/cards/routes/list/route.ts

import { NextRequest } from "next/server";

import { CardController } from "../../controllers/CardController";

const controller = new CardController();

export async function GET(request: NextRequest) {
    return controller.list(request);
}