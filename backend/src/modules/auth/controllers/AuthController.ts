import { NextRequest, NextResponse } from "next/server";

import { RegisterUserService } from "../services/RegisterUserService";
import { LoginUserService } from "../services/LoginUserService";
import { ListUserService } from "../services/ListUserService";
import { getUser } from "@/shared/utils/getUser";
import { CORS_HEADERS } from "@/shared/cors/headers";

export class AuthController {

    private registerService = new RegisterUserService();
    private loginService = new LoginUserService();
    private listService = new ListUserService()

    async register(request: NextRequest) {

        try {

            const body = await request.json();

            const user = await this.registerService.execute(body);

            return NextResponse.json(user, {
                status: 201,
                headers: CORS_HEADERS
            });

        }

        catch (error) {
            console.error(error)
            return NextResponse.json(
                {
                    error:
                        error instanceof Error
                            ? error.message
                            : "Erro interno.",
                },
                {
                    status: 400,
                }
            );

        }

    }

    async login(request: NextRequest) {

        try {

            const body = await request.json();

            const user =
                await this.loginService.execute(body);

            return NextResponse.json(user, {
                headers: CORS_HEADERS
            });

        }

        catch (error) {
            console.error(error)
            return NextResponse.json(
                {
                    error:
                        error instanceof Error
                            ? error.message
                            : "Erro interno.",
                },
                {
                    status: 401,
                }
            );

        }

    }

    async list(request: NextRequest) {
        try {
            const user = await getUser(request)
            const users = await this.listService.execute()
            return NextResponse.json(users, {
                headers: CORS_HEADERS
            })
        } catch (error) {
            console.error(error)
            return NextResponse.json({
                message: error
            })
        }
    }

}