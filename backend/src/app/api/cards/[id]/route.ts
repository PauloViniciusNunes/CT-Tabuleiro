// src/app/api/cards/[id]/route.ts

export {OPTIONS} from "../../../../../middleware"
export { GET } from "@/modules/cards/routes/get/route";
export { PATCH } from "@/modules/cards/routes/update/route";
export { DELETE } from "@/modules/cards/routes/delete/route";