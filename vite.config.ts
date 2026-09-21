import { defineConfig, loadEnv } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";

function serviceOrigin(value: string | undefined, fallback: string): string {
    const configured = value?.trim().replace(/\/$/, "");

    if (!configured) {
        return fallback;
    }

    return configured.endsWith("/api")
        ? configured.slice(0, -4)
        : configured;
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), "");
    const apiOrigin = serviceOrigin(env.VITE_API_URL, "http://127.0.0.1:3000");
    const socketOrigin = serviceOrigin(env.VITE_SOCKET_URL, "http://127.0.0.1:3001");

    return {
    plugins: [
        react(),
        tailwindcss(),
    ],


    server: {
        host: "0.0.0.0",
        port: 5173,
        strictPort: true,
        allowedHosts: [
            "ct-tabuleiro.onrender.com",
            "ct-tabuleiro.local",
            "localhost",
            "127.0.0.1",
            ".trycloudflare.com",
        ],
        proxy: {
            "/api": {
                target: apiOrigin,
                changeOrigin: true,
            },
            "/socket.io": {
                target: socketOrigin,
                changeOrigin: true,
                ws: true,
            },
        },
    },
    preview: {
        host: "0.0.0.0",
        allowedHosts: [
            "ct-tabuleiro.onrender.com",
        ],
    },
    };
});
