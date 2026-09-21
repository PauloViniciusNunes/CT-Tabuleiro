import { NextRequest} from "next/server";

import { TokenTemplateController } from "../../controllers/TokenTemplateController";

const controller = new TokenTemplateController();

export async function GET(request: NextRequest) {
    return controller.list(request);
}