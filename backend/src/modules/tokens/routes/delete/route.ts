import { NextRequest } from "next/server";

import { TokenController } from "../../controllers/TokenController";

const controller = new TokenController();

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {

    const { id } = await params;

    return await controller.delete(request, id);

}