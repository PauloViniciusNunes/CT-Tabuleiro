import type { MechanicInstance } from "../mechanics/MechanicInstance";

export function isOwnApplication(
    mechanic: MechanicInstance,
    data?: Record<string, unknown>,
): boolean {
    const application = data?.application;
    if (!application || typeof application !== "object") return false;
    const instance = (application as { instance?: unknown }).instance;
    return !!instance && typeof instance === "object" &&
        (instance as { id?: unknown }).id === mechanic.id;
}

export function matchesFailedTest(mechanic: MechanicInstance): boolean {
    const requiredAttribute = mechanic.metadata.requiredFailedAttribute;
    return mechanic.metadata.testSucceeded === false &&
        (typeof requiredAttribute !== "string" ||
            mechanic.metadata.testAttribute === requiredAttribute);
}
