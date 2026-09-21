import { NextRequest } from "next/server";
import { AuthController } from "../../controllers/AuthController";

const controller = new AuthController();

export async function POST(request: NextRequest) {
    return controller.login(request);
}