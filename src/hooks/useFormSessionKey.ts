/**
 * Uses the persisted request identity as the React component identity.
 * This remounts a new request before a stale submission lock can be reused.
 */
export function useFormSessionKey(prefix: string, requestId: unknown): string {
  const identity = typeof requestId === "string" || typeof requestId === "number"
    ? String(requestId)
    : "idle";
  return prefix + ":" + identity;
}
