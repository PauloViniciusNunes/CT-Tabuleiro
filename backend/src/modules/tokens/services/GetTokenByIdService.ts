import { TokenRepository } from "../repositories/TokenRepository";
import { TokenIdValidator } from "../validators/TokenIdValidator";
import { TokenTransformationService } from "./TokenTransformationService";

export class GetTokenByIdService {
    constructor(
        private readonly repository = new TokenRepository(),
        private readonly transformationService = new TokenTransformationService(repository),
    ) {}

    async execute(
        userId: string,
        tokenId: string,
    ) {
        const id = TokenIdValidator.parse(tokenId);
        const token = await this.repository.findById(id);

        if (!token) {
            throw new Error("Token não encontrado.");
        }

        if (token.userId !== userId) {
            throw new Error("Você não possui acesso a este token.");
        }

        return this.transformationService.resolveOne(token);
    }
}
