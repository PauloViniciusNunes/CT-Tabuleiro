const configuredFrontendOrigin = (process.env.FRONTEND_ORIGIN ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .find(Boolean);

export const CORS_HEADERS = {
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Vary": "Origin",
    ...(configuredFrontendOrigin
        ? { "Access-Control-Allow-Origin": configuredFrontendOrigin }
        : {}),
};
