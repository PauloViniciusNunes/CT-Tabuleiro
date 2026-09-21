import { UserRepository } from "../repositories/UserRepository";

export class ListUserService {
    
    private readonly repository = new UserRepository()
    
    async execute() {
        const _users = await this.repository.list()

        const users = structuredClone(_users)

        const cleanUsers = users.map((u) => {
            const {password: _, ...rest} = u

            return rest
        })

        return cleanUsers
    }
}