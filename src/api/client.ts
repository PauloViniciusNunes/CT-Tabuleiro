const API_URL = (import.meta.env.VITE_API_URL?.trim() || "/api").replace(/\/$/, "");

export async function api<T>(
    endpoint: string,
    options?: RequestInit,
): Promise<T> {

    const token = sessionStorage.getItem("@app:token");

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,

        headers: {
            "Content-Type": "application/json",

            ...(token && {
                Authorization: `Bearer ${token}`,
            }),

            ...options?.headers,
        },
    });

    if (!response.ok) {
        throw new Error(await response.text());
    }

    return response.json();
}
