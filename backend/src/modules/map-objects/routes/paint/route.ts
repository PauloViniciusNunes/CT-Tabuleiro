import { NextRequest } from "next/server";
import { MapObjectController } from "../../controllers/MapObjectController";

const controller = new MapObjectController();

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    return controller.paint(request, (await params).id);
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    return controller.erase(request, (await params).id);
}
