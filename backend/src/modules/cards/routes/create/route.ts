// src/modules/cards/routes/create/route.ts

import { NextRequest } from "next/server";

import { CardController } from "../../controllers/CardController";

const controller = new CardController();

export async function POST(request: NextRequest) {
    return controller.create(request);
}