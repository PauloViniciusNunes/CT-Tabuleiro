import type { ParalysisState } from "../types/status";
import type { EngineContext } from "../types/BoardEngineContext";
import type React from "react";
import type { SetStateAction } from "react";

export const getParalysis = (tokenParalysis: Record<string, ParalysisState>, tokenId: string): ParalysisState =>
    tokenParalysis[tokenId] ?? 'none';

export const setParalysis = (setTokenParalysis: React.Dispatch<SetStateAction<Record<string, ParalysisState>>>, tokenId: string, state: ParalysisState) => {
    setTokenParalysis((prev: Record<string, ParalysisState>) => ({ ...prev, [tokenId]: state }));
};
