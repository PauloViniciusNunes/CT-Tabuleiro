import type {
    PendingSpecialResponse,
    SpecialResponseValue,
} from "../../special-response/types";
import { randomChoice, randomInteger, type RandomSource } from "../utils/random";

function numberValue(
    field: Extract<PendingSpecialResponse["fields"][number], { type: "number" }>,
    random: RandomSource,
): number {
    if (field.defaultValue !== undefined) return field.defaultValue;

    const minimum = field.min ?? 0;
    const maximum = field.max ?? Math.max(minimum, minimum + 10);
    const step = field.step ?? (field.integer ? 1 : 0.5);
    const stepCount = Math.max(0, Math.floor((maximum - minimum) / step));
    const value = minimum + randomInteger(0, stepCount, random) * step;
    return field.integer ? Math.round(value) : Number(value.toFixed(6));
}

/** Produces a schema-valid autonomous answer for every supported field type. */
export function decideAiSpecialResponseValues(
    pending: PendingSpecialResponse,
    random: RandomSource = Math.random,
): Record<string, SpecialResponseValue> {
    return Object.fromEntries(pending.fields.flatMap((field) => {
        if (field.type === "number") {
            return [[field.id, numberValue(field, random)]];
        }

        const configuredDefault = field.defaultValue === undefined
            ? null
            : field.options.find((option) => Object.is(option.value, field.defaultValue));
        const option = configuredDefault ?? randomChoice(field.options, random);
        return option ? [[field.id, option.value]] : [];
    }));
}
