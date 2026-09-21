import { NextRequest } from "next/server";

import { TokenController } from "@/modules/tokens/controllers/TokenController";

const controller = new TokenController();

export async function POST(request: NextRequest) {
    return await controller.list(request);
}