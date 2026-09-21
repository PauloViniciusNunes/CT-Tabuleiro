import { NextRequest, NextResponse } from "next/server";

import { corsHeadersForOrigin } from "@/shared/cors/origin";

export function middleware(request: NextRequest) {
    const response = NextResponse.next();
    const headers = corsHeadersForOrigin(request.headers.get("origin"));

    for (const [name, value] of Object.entries(headers)) {
        response.headers.set(name, value);
    }

    return response;
}

export const config = {
    matcher: "/api/:path*",
};

export async function OPTIONS(request: NextRequest) {
    return new Response(null, {
        status: 204,
        headers: corsHeadersForOrigin(request.headers.get("origin")),
    });
}
