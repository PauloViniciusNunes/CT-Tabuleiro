import { NextRequest} from "next/server";

import { TokenTemplateController } from "../../controllers/TokenTemplateController";

const controller = new TokenTemplateController();

export async function DELETE(request: NextRequest, {params}:  {params: Promise<{id: string}>}) {
    const {id} = await params;
    return await controller.delete(request, id);
}