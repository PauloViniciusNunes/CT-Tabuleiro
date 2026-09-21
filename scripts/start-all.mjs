import { spawn, spawnSync } from "node:child_process";
import net from "node:net";
import process from "node:process";

const ROOT = new URL("../", import.meta.url);
const IS_WINDOWS = process.platform === "win32";
const NPM = IS_WINDOWS ? "npm.cmd" : "npm";
const CLOUDFLARED = IS_WINDOWS ? "cloudflared.exe" : "cloudflared";
const LOCAL_URL = "http://ct-tabuleiro.local:5173";
const INTERNAL_FRONTEND_URL = "http://127.0.0.1:5173";
const INTERNAL_BACKEND_URL = "http://127.0.0.1:3000";
const INTERNAL_SOCKET_URL = "http://127.0.0.1:3001";
const NO_CLOUDFLARE = process.argv.includes("--no-cloudflare")
    || process.env.CT_DISABLE_CLOUDFLARE === "1";

const children = new Map();
let shuttingDown = false;
let exitCode = 0;
let remoteUrl;

function prefixedWriter(label, stream, onText) {
    let remainder = "";

    return (chunk) => {
        const text = chunk.toString();
        onText?.(text);
        const lines = `${remainder}${text}`.split(/\r?\n/);
        remainder = lines.pop() ?? "";

        for (const line of lines) {
            if (line.length > 0) {
                stream.write(`[${label}] ${line}\n`);
            }
        }
    };
}

function spawnService(label, command, args, { optional = false, onText } = {}) {
    const child = spawn(command, args, {
        cwd: ROOT,
        env: {
            ...process.env,
            ...(process.env.NO_COLOR
                ? {}
                : { FORCE_COLOR: process.env.FORCE_COLOR ?? "1" }),
        },
        detached: !IS_WINDOWS,
        stdio: ["ignore", "pipe", "pipe"],
    });

    children.set(label, { child, optional });
    child.stdout.on("data", prefixedWriter(label, process.stdout, onText));
    child.stderr.on("data", prefixedWriter(label, process.stderr, onText));

    child.on("error", (error) => {
        console.error(`[${label}] Não foi possível iniciar: ${error.message}`);
        if (!optional) {
            exitCode = 1;
            void shutdown();
        }
    });

    child.on("exit", (code, signal) => {
        children.delete(label);

        if (shuttingDown) {
            return;
        }

        const reason = signal ? `sinal ${signal}` : `código ${code ?? "desconhecido"}`;
        console.error(`[${label}] Processo encerrado (${reason}).`);

        if (optional) {
            console.error("[CLOUDFLARE] O ambiente local permanece disponível.");
            const previouslyAvailableRemoteUrl = remoteUrl;
            remoteUrl = undefined;
            if (previouslyAvailableRemoteUrl) {
                console.error(`[CLOUDFLARE] A URL ${previouslyAvailableRemoteUrl} não está mais disponível.`);
            }
            printAccessSummary();
            return;
        }

        exitCode = code && code !== 0 ? code : 1;
        void shutdown();
    });

    return child;
}

function waitForPort(port, timeoutMs = 60_000) {
    const startedAt = Date.now();

    return new Promise((resolve, reject) => {
        const attempt = () => {
            const socket = net.createConnection({ host: "127.0.0.1", port });

            socket.once("connect", () => {
                socket.destroy();
                resolve();
            });
            socket.once("error", () => {
                socket.destroy();
                if (Date.now() - startedAt >= timeoutMs) {
                    reject(new Error(`timeout aguardando a porta ${port}`));
                    return;
                }
                setTimeout(attempt, 250);
            });
        };

        attempt();
    });
}

function isPortOpen(port) {
    return new Promise((resolve) => {
        const socket = net.createConnection({ host: "127.0.0.1", port });

        socket.once("connect", () => {
            socket.destroy();
            resolve(true);
        });
        socket.once("error", () => {
            socket.destroy();
            resolve(false);
        });
    });
}

async function assertRequiredPortsAreFree() {
    const ports = [5173, 3000, 3001];
    const checks = await Promise.all(
        ports.map(async (port) => ({ port, occupied: await isPortOpen(port) })),
    );
    const occupiedPorts = checks.filter(({ occupied }) => occupied).map(({ port }) => port);

    if (occupiedPorts.length === 0) {
        return;
    }

    throw new Error(
        `as portas ${occupiedPorts.join(", ")} já estão em uso. `
        + "Encerre a instância anterior do CT-Tabuleiro e tente novamente.",
    );
}

function printAccessSummary(remote = remoteUrl) {
    const width = 68;
    const separator = "=".repeat(width);

    console.log(`\n${separator}`);
    console.log("CT-TABULEIRO ONLINE");
    console.log(separator);
    console.log(`Local:             ${LOCAL_URL}`);
    console.log(`Cloudflare:        ${remote ?? "indisponível/desativado"}`);
    console.log(`Frontend interno:  ${INTERNAL_FRONTEND_URL}`);
    console.log(`Backend interno:   ${INTERNAL_BACKEND_URL}`);
    console.log(`Socket interno:    ${INTERNAL_SOCKET_URL}`);
    console.log(separator);

    if (remote) {
        console.log("Compartilhe somente a URL Cloudflare com os jogadores.\n");
    }
}

function stopChild(child, signal) {
    if (child.exitCode !== null || child.signalCode !== null) {
        return;
    }

    try {
        if (IS_WINDOWS) {
            child.kill(signal);
        } else {
            process.kill(-child.pid, signal);
        }
    } catch (error) {
        if (error?.code !== "ESRCH") {
            console.error(`[CT-TABULEIRO] Falha ao encerrar PID ${child.pid}: ${error.message}`);
        }
    }
}

async function shutdown(signal) {
    if (shuttingDown) {
        return;
    }

    shuttingDown = true;
    if (signal) {
        console.log(`\n[CT-TABULEIRO] ${signal} recebido. Encerrando os serviços...`);
    }

    for (const { child } of children.values()) {
        stopChild(child, "SIGTERM");
    }

    const forceTimer = setTimeout(() => {
        for (const { child } of children.values()) {
            stopChild(child, "SIGKILL");
        }
    }, 5_000);
    forceTimer.unref();

    await Promise.allSettled(
        [...children.values()].map(({ child }) => new Promise((resolve) => {
            if (child.exitCode !== null || child.signalCode !== null) {
                resolve();
                return;
            }
            child.once("exit", resolve);
        })),
    );

    clearTimeout(forceTimer);
    process.exit(exitCode);
}

function cloudflaredIsInstalled() {
    const result = spawnSync(CLOUDFLARED, ["--version"], {
        cwd: ROOT,
        stdio: "ignore",
    });
    return !result.error && result.status === 0;
}

function startCloudflare() {
    let captureBuffer = "";
    let connectionAnnounced = false;

    spawnService(
        "CLOUDFLARE",
        CLOUDFLARED,
        ["tunnel", "--no-autoupdate", "--url", INTERNAL_FRONTEND_URL],
        {
            optional: true,
            onText: (text) => {
                if (!connectionAnnounced && text.includes("Registered tunnel connection")) {
                    connectionAnnounced = true;
                    console.log("[CLOUDFLARE] connected");
                }

                if (!remoteUrl) {
                    captureBuffer = `${captureBuffer}${text}`.slice(-16_384);
                    const match = captureBuffer.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
                    if (!match) {
                        return;
                    }

                    remoteUrl = match[0];
                    console.log("[CLOUDFLARE] Tunnel criado com sucesso.");
                    printAccessSummary(remoteUrl);
                }
            },
        },
    );
}

async function main() {
    process.on("SIGINT", () => void shutdown("SIGINT"));
    process.on("SIGTERM", () => void shutdown("SIGTERM"));

    try {
        await assertRequiredPortsAreFree();
    } catch (error) {
        console.error(`[CT-TABULEIRO] ${error.message}`);
        process.exitCode = 1;
        return;
    }

    spawnService("FRONTEND", NPM, ["run", "dev"]);
    spawnService("BACKEND", NPM, ["run", "backend"]);
    spawnService("SOCKET", NPM, ["run", "socket"]);

    try {
        await Promise.all([
            waitForPort(5173).then(() => console.log(`[FRONTEND] running at ${INTERNAL_FRONTEND_URL}`)),
            waitForPort(3000).then(() => console.log(`[BACKEND] running at ${INTERNAL_BACKEND_URL}`)),
            waitForPort(3001).then(() => console.log(`[SOCKET] running at ${INTERNAL_SOCKET_URL}`)),
        ]);
    } catch (error) {
        console.error(`[CT-TABULEIRO] ${error.message}`);
        exitCode = 1;
        await shutdown();
        return;
    }

    console.log("[PROXY] Gateway Vite ativo: /api -> :3000, /socket.io -> :3001");

    if (NO_CLOUDFLARE) {
        console.log("[CLOUDFLARE] Acesso remoto desativado para esta execução.");
        printAccessSummary();
        return;
    }

    if (!cloudflaredIsInstalled()) {
        console.error("[CT-TABULEIRO] cloudflared não encontrado.");
        console.error("[CT-TABULEIRO] Instale o Cloudflare Tunnel antes de utilizar acesso remoto.");
        printAccessSummary();
        return;
    }

    startCloudflare();
}

void main();
