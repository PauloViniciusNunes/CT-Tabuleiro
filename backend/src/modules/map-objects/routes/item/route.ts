import { NextRequest } from "next/server";
import { MapObjectController } from "../../controllers/MapObjectController";

const controller = new MapObjectController();

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; objectId: string }> },
) {
    const { id, objectId } = await params;
    return controller.update(request, id, objectId);
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; objectId: string }> },
) {
    const { id, objectId } = await params;
    return controller.delete(request, id, objectId);
}
