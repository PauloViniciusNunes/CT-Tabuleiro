import { CreateTokenValidator } from "./CreateTokenValidator";

export const UpdateTokenValidator = CreateTokenValidator.omit({
    id: true
}).partial().extend({});
