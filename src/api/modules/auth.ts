import { api } from "../client";
import type { DataRegisterAPI, DataLoginAPI } from "../auxiliary/types";

export interface AuthResponse {
    token: string;
    user?: {
        id: string;
        name: string;
        email: string;
    };
}

export class AuthAPI {
    static async register(data: DataRegisterAPI) {
        return await api<unknown>('/auth/register', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    static async login(data: DataLoginAPI) {
        return await api<AuthResponse>('/auth/login', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }
}