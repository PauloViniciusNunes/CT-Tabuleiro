import { NextRequest } from "next/server";

import { TokenController } from "@/modules/tokens/controllers/TokenController";

console.log("1 - Chegando até antes da criação do controlador.")

const controller = new TokenController();

export async function POST(request: NextRequest) {
    console.log("Está chegando até aqui")
    return await controller.create(request);
}