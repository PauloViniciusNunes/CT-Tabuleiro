import { CreateTokenDTO } from "./CreateTokenDTO";

export type UpdateTokenDTO = Partial<Omit<CreateTokenDTO, "mapId" | "templateId" | "createId">> & {
    mapId?: string;
};
