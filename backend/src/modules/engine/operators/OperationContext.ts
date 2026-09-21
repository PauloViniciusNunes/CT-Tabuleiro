/**
 * Proveniência mínima compartilhada entre operações da engine.
 *
 * Ela permite que uma operação derivada preserve a sua causa sem introduzir,
 * antecipadamente, uma infraestrutura de histórico ou um grafo de causas.
 */
export interface OperationIntent {
    readonly battleId: string;
    readonly parentOperationId?: string;
    readonly cause?: string;
    readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface OperationContext extends OperationIntent {
    readonly operationId: string;
}
