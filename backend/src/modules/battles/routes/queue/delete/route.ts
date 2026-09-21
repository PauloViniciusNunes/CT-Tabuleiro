import { NextRequest } from "next/server";

import { PendingQueueController } from "@/modules/battles/controllers/PendingQueueController";

const controller = new PendingQueueController()

export async function DELETE(request: NextRequest, { params }: {params: Promise<{ id: string }>}) {
    const { id } = await params
    return controller.delete(request, id)
}