import type { ParalysisState } from "../types/status";
import type { EngineContext } from "../types/BoardEngineContext";

export const getParalysis = (context: EngineContext, tokenId: string): ParalysisState =>
    (context.tokenParalysis as Record<string, ParalysisState>)[tokenId] ?? 'none';

export const setParalysis = (context: EngineContext, tokenId: string, state: ParalysisState) => {
    context.setTokenParalysis((prev: Record<string, ParalysisState>) => ({ ...prev, [tokenId]: state }));
};
