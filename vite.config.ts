import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
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
                target: "http://127.0.0.1:3000",
                changeOrigin: true,
            },
            "/socket.io": {
                target: "http://127.0.0.1:3001",
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
});
