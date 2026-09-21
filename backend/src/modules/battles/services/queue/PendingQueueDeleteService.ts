import { PendingQueueRepository } from "../../repositories/PendingQueueRepository";

export class PendingQueueDeleteService {

    constructor(
        private readonly repository = new PendingQueueRepository(),
    ) {}

    async execute(id: string)
    {
        const queue = await this.repository.delete(id)
        return queue
    }

}