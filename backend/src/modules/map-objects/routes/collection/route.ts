import { NextRequest } from "next/server";
import { MapObjectController } from "../../controllers/MapObjectController";

const controller = new MapObjectController();

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    return controller.list(request, (await params).id);
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    return controller.create(request, (await params).id);
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    return controller.clear(request, (await params).id);
}
