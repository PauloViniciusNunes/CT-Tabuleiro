import { TokenRepository } from "../repositories/TokenRepository";
import { TokenIdValidator } from "../validators/TokenIdValidator";
import { UpdateTokenValidator } from "../validators/UpdateTokenValidator";
import { mapUpdateTokenInput } from "./TokenMapper";
import { TokenTransformationService } from "./TokenTransformationService";

export class UpdateTokenService {
    constructor(
        private readonly repository = new TokenRepository(),
        private readonly transformationService = new TokenTransformationService(repository),
    ) {}

    async execute(
        userId: string,
        tokenId: string,
        data: unknown,
    ) {
        const id = TokenIdValidator.parse(tokenId);
        const input = UpdateTokenValidator.parse(data);
        const token = await this.repository.findById(id);

        if (!token) {
            throw new Error("Token não encontrado.");
        }

        if (token.userId !== userId) {
            throw new Error("Você não possui acesso a este token.");
        }



        const resolvedInput = await this.transformationService.prepareUpdate(token, input);
        const updated = await this.repository.update(
            id,
            mapUpdateTokenInput(resolvedInput),
        );
        return this.transformationService.resolveOne(updated);
    }
}
