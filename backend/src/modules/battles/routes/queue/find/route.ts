import { PendingQueueController } from "@/modules/battles/controllers/PendingQueueController";

const controller = new PendingQueueController()

export async function GET({ params }: {params: Promise<{ id: string }>}) {
    const { id } = await params
    return controller.find(id)
}