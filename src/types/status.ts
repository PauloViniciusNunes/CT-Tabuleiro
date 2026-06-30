export type ParalysisState = 'none' | 'paralisia' | 'paralisia_rapida';

export type PostParalyse =
{
    responderId: string;
    forcedId: string;
    allowedPostAtack: boolean;
}