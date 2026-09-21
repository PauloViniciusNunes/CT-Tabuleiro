import { api } from "../client";

export class UserAPI {
    static async list() {
        return await api<unknown[]>(`/auth/list`, {
            method: "GET"
        })
    }

    static async getId(token: string) {
        return await api<unknown>('/')
    }

}