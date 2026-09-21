import bcrypt from "bcrypt";
import { UserRepository } from "../repositories/UserRepository";
import { RegisterUserValidator } from "../validators/RegisterUserValidator";

export class RegisterUserService {

    constructor(
        private readonly repository = new UserRepository()
    ) {}

    async execute(data: unknown) {

        const input = RegisterUserValidator.parse(data);

        const alreadyExists = await this.repository.findByEmail(input.email);

        if (alreadyExists) {
            throw new Error("E-mail já cadastrado.");
        }

        const password = await bcrypt.hash(input.password, 10);

        const user =
            await this.repository.create({
                ...input,
                password,
            });

        const { password: _, ...result } = user;

        return result;
    }

}