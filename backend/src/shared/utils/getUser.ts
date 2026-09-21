import { NextRequest } from "next/server";

import { AuthMiddleware } from "../middleware/AuthMiddleware";

import { UserRepository } from "@/modules/auth/repositories/UserRepository";

const repository = new UserRepository();

export async function getUser(request: NextRequest) {

    const { userId } = AuthMiddleware.authenticate(request);

    const user = await repository.findById(userId);

    if (!user) {
        throw new Error("Usuário não encontrado.");
    }

    return user;
}