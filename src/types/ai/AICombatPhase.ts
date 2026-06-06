export const AICombatPhase = {
    IDLE: "IDLE",
    TURN: "TURN",
    REACTION: "REACTION",
    RESPONSE: "RESPONSE",
    DEFENSE: "DEFENSE",
} as const;

export type AICombatPhase =
    typeof AICombatPhase[keyof typeof AICombatPhase];