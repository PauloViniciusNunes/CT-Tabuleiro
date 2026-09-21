import { NextRequest } from "next/server";
import { JWTService } from "@/modules/auth/services/JWTService";

const jwtService = new JWTService();

export class AuthMiddleware {

    static authenticate(request: NextRequest) {

        const authHeader =
            request.headers.get("authorization");

        if (!authHeader) {
            throw new Error("Token não informado.");
        }

        const [type, token] =
            authHeader.split(" ");

        if (type !== "Bearer" || !token) {
            throw new Error("Token inválido.");
        }

        return jwtService.verify(token);
    }

}