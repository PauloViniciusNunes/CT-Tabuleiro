import { NextRequest} from "next/server";

import { TokenTemplateController } from "../../controllers/TokenTemplateController";

const controller = new TokenTemplateController();

export async function GET(request: NextRequest, {params}:  {params: Promise<{id: string}>}) {
    const {id} = await params;
    return await controller.get(request, id)
}