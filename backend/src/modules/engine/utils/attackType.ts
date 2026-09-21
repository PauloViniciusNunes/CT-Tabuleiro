export type AttackType = "fisico" | "magico";

export function attackTypeFromAttribute(attribute: string): AttackType {
    return attribute === "forca" || attribute === "destreza"
        ? "fisico"
        : "magico";
}
