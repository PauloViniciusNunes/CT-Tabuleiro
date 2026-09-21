const DEFAULT_ALLOWED_ORIGINS = [
    "http://ct-tabuleiro.local:5173",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
] as const;

function configuredOrigins(): Set<string> {
    const origins = (process.env.FRONTEND_ORIGIN ?? "")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean);

    return new Set([...DEFAULT_ALLOWED_ORIGINS, ...origins]);
}

export function isAllowedFrontendOrigin(origin: string | undefined | null): boolean {
    if (!origin) {
        // Clientes internos e ferramentas server-to-server normalmente não enviam Origin.
        return true;
    }

    if (configuredOrigins().has(origin)) {
        return true;
    }

    try {
        const url = new URL(origin);
        return url.protocol === "https:"
            && url.hostname.endsWith(".trycloudflare.com")
            && url.hostname !== "trycloudflare.com";
    } catch {
        return false;
    }
}

export function corsHeadersForOrigin(origin: string | undefined | null): Record<string, string> {
    const headers: Record<string, string> = {
        "Access-Control-Allow-Headers": "Authorization, Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
        "Vary": "Origin",
    };

    if (origin && isAllowedFrontendOrigin(origin)) {
        headers["Access-Control-Allow-Origin"] = origin;
    }

    return headers;
}
