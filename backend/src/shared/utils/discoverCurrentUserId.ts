import { TokenTemplateRepository } from "@/modules/asset-library/tokens/repositories/TokenTemplateRepository"
import { UserRepository } from "@/modules/auth/repositories/UserRepository"

const tokenInstanceRepository = new TokenTemplateRepository()
const userRepository = new UserRepository()

export async function discoverCurrentUserId(tokenId: string, mapId: string) {

    console.log("[discoverCurrentUserId]");
    console.log("tokenId:", tokenId);
    console.log("mapId:", mapId);


    if(!tokenId || tokenId === "") {
        throw new Error("Não foi dado um dado coerente a tokenId!")
    }

    const boardTokens = await tokenInstanceRepository.listByMapId(mapId)
    console.log("boardTokens:", boardTokens?.map(t => t.id));
    
    if(!boardTokens || boardTokens.length <= 0) {
        throw new Error("Não foi possível encontrar boardTokens, portanto não haverpá retorno.")
    }

    if(!boardTokens.some((t) => t.id === tokenId)) {
        throw new Error("Nenhum token associado encontrado no tabuleiro.")
    }

    const user = await userRepository.userIdByTokenId(tokenId);

    if(!user || user.id === "") {
        throw new Error("Dono do token não encontrado.")
    }

    return user.id

}