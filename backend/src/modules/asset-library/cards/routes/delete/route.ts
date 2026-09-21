import { TokenCardController } from "../../controllers/TokenCardController";

const controller = new TokenCardController()

export async function DELETE({params}: {params: Promise<{id: string}>}) {
    const {id} = await params
    return controller.delete(id)
}