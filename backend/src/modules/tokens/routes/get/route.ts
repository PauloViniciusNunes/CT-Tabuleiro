import { NextRequest } from "next/server";

import { TokenController } from "@/modules/tokens/controllers/TokenController";

const controller = new TokenController();

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {

    const { id } = await params;

    return await controller.get(request, id);

}