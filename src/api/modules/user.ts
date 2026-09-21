import { api } from "../client";

export class UserAPI {
    static async list() {
        return await api<unknown[]>(`/auth/list`, {
            method: "GET"
        })
    }
}
