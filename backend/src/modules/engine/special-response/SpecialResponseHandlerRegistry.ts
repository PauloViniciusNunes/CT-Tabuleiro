import type {
    SpecialResponseHandler,
    SpecialResponseHandlerContext,
} from "./types";

/**
 * Durable pending records store only handler keys. Application bootstrap code
 * registers the matching implementation, so no callback is serialized in DB.
 */
export class SpecialResponseHandlerRegistry {
    private static readonly handlers = new Map<string, SpecialResponseHandler>();

    static register(key: string, handler: SpecialResponseHandler): () => void {
        if (!key || this.handlers.has(key)) {
            throw new Error(`Handler de resposta especial duplicado ou inválido: "${key}".`);
        }
        this.handlers.set(key, handler);
        return () => this.handlers.delete(key);
    }

    static has(key: string): boolean {
        return this.handlers.has(key);
    }

    static async dispatch(key: string, context: SpecialResponseHandlerContext): Promise<void> {
        const handler = this.handlers.get(key);
        if (!handler) {
            throw new Error(`Nenhum handler foi registrado para "${key}".`);
        }
        await handler(context);
    }
}
