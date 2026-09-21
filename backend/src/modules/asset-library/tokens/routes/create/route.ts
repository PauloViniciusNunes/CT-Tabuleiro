import { NextRequest} from "next/server";

import { TokenTemplateController } from "../../controllers/TokenTemplateController";

const controller = new TokenTemplateController();

export async function POST(request: NextRequest) {
    return controller.create(request);
}