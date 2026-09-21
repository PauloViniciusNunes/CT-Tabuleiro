import bcrypt from "bcrypt";
import { UserRepository } from "../repositories/UserRepository";
import { LoginValidator } from "../validators/LoginValidator";
import { JWTService } from "./JWTService";

export class LoginUserService {

    constructor(
        private readonly repository = new UserRepository(),
        private readonly jwtService = new JWTService(),
    ) {}

    async execute(data: unknown) {

        const input  = LoginValidator.parse(data);

        const user =
            await this.repository.findByEmail(input.email);

        if (!user) {
            throw new Error("Credenciais inválidas.");
        }

        const passwordMatches =
            await bcrypt.compare(
                input.password,
                user.password
            );

        if (!passwordMatches) {
            throw new Error("Credenciais inválidas.");
        }

        const token =
            this.jwtService.generate(user.id);

        const { password: _, ...result } = user;

        return {
            token,
            user: result,
        };
    }

}