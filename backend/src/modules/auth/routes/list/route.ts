import { NextRequest } from "next/server";
import { AuthController } from "../../controllers/AuthController";

const controller = new AuthController();

export async function GET(request: NextRequest) {
    return controller.list(request);
}