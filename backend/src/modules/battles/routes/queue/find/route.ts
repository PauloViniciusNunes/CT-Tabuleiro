import { PendingQueueController } from "@/modules/battles/controllers/PendingQueueController";

const controller = new PendingQueueController()

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id } = await params
    return controller.find(id)
}
import type { NextRequest } from "next/server";
