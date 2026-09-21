import { z } from "zod";
import type {
    PendingSpecialResponse,
    SpecialResponseField,
    SpecialResponseResolution,
    SpecialResponseValue,
} from "./types";

const fieldIdSchema = z.string().trim().min(1).max(64).regex(/^[a-zA-Z][a-zA-Z0-9_-]*$/);
const numberFieldSchema = z.object({
    id: fieldIdSchema,
    label: z.string().trim().min(1).max(120),
    type: z.literal("number"),
    required: z.boolean().optional(),
    min: z.number().finite().optional(),
    max: z.number().finite().optional(),
    step: z.number().finite().positive().optional(),
    integer: z.boolean().optional(),
    defaultValue: z.number().finite().optional(),
});
const selectFieldSchema = z.object({
    id: fieldIdSchema,
    label: z.string().trim().min(1).max(120),
    type: z.literal("select"),
    required: z.boolean().optional(),
    options: z.array(z.object({
        label: z.string().trim().min(1).max(120),
        value: z.union([z.string(), z.number().finite()]),
    })).min(1),
    defaultValue: z.union([z.string(), z.number().finite()]).optional(),
});

export const specialResponseFieldsSchema = z.array(
    z.discriminatedUnion("type", [numberFieldSchema, selectFieldSchema]),
).max(20);

export const pendingSpecialResponseSchema = z.object({
    requestId: z.string().min(1),
    battleId: z.string().min(1),
    mapId: z.string().min(1),
    responderTokenId: z.string().min(1),
    responderUserId: z.string().min(1),
    requestedByTokenId: z.string().min(1).optional(),
    title: z.string().trim().min(1).max(160),
    description: z.string().trim().max(1000).optional(),
    fields: specialResponseFieldsSchema,
    handlerKey: z.string().trim().min(1).max(120),
    context: z.record(z.string(), z.unknown()),
    createdAt: z.string().datetime(),
    status: z.literal("PENDING"),
});

export const specialResponseCommandSchema = z.object({
    battleId: z.string().min(1),
    requestId: z.string().min(1),
    action: z.enum(["submit", "cancel"]),
    values: z.record(z.string(), z.unknown()).optional().default({}),
});

function validateFieldDeclaration(field: SpecialResponseField): void {
    if (field.type === "number") {
        if (field.min !== undefined && field.max !== undefined && field.min > field.max) {
            throw new Error(`O campo "${field.label}" possui MIN maior que MAX.`);
        }
        if (field.integer && field.step !== undefined && !Number.isInteger(field.step)) {
            throw new Error(`O STEP de "${field.label}" precisa ser inteiro.`);
        }
        if (field.defaultValue !== undefined) {
            validateNumberValue(field, field.defaultValue);
        }
        return;
    }

    const values = field.options.map((option) => option.value);
    if (new Set(values.map((value) => `${typeof value}:${value}`)).size !== values.length) {
        throw new Error(`O campo "${field.label}" possui opções duplicadas.`);
    }
    if (
        field.defaultValue !== undefined &&
        !values.some((value) => Object.is(value, field.defaultValue))
    ) {
        throw new Error(`O valor padrão de "${field.label}" não pertence às opções.`);
    }
}

function validateNumberValue(
    field: Extract<SpecialResponseField, { type: "number" }>,
    value: number,
): void {
    if (!Number.isFinite(value)) {
        throw new Error(`O campo "${field.label}" precisa ser numérico.`);
    }
    if (field.integer && !Number.isInteger(value)) {
        throw new Error(`O campo "${field.label}" precisa ser inteiro.`);
    }
    if (field.min !== undefined && value < field.min) {
        throw new Error(`O campo "${field.label}" precisa ser no mínimo ${field.min}.`);
    }
    if (field.max !== undefined && value > field.max) {
        throw new Error(`O campo "${field.label}" precisa ser no máximo ${field.max}.`);
    }
    if (field.step !== undefined) {
        const base = field.min ?? 0;
        const steps = (value - base) / field.step;
        if (Math.abs(steps - Math.round(steps)) > 1e-9) {
            throw new Error(`O campo "${field.label}" precisa respeitar o intervalo ${field.step}.`);
        }
    }
}

export function validateSpecialResponseFields(input: unknown): SpecialResponseField[] {
    const fields = specialResponseFieldsSchema.parse(input) as SpecialResponseField[];
    const ids = fields.map((field) => field.id);
    if (new Set(ids).size !== ids.length) {
        throw new Error("Os campos do formulário especial precisam ter IDs únicos.");
    }
    fields.forEach(validateFieldDeclaration);
    return fields;
}

export function validateSpecialResponseValues(
    pending: PendingSpecialResponse,
    rawValues: Readonly<Record<string, unknown>>,
): SpecialResponseResolution["values"] {
    const fieldIds = new Set(pending.fields.map((field) => field.id));
    const unexpectedField = Object.keys(rawValues).find((key) => !fieldIds.has(key));
    if (unexpectedField) {
        throw new Error(`O campo inesperado "${unexpectedField}" não pertence ao formulário.`);
    }

    const values: Record<string, SpecialResponseValue> = {};
    for (const field of pending.fields) {
        const rawValue = rawValues[field.id];
        if (rawValue === undefined || rawValue === null || rawValue === "") {
            if (field.required !== false) {
                throw new Error(`O campo "${field.label}" é obrigatório.`);
            }
            continue;
        }

        if (field.type === "number") {
            if (typeof rawValue !== "number") {
                throw new Error(`O campo "${field.label}" precisa ser numérico.`);
            }
            validateNumberValue(field, rawValue);
            values[field.id] = rawValue;
            continue;
        }

        if (
            (typeof rawValue !== "string" && typeof rawValue !== "number") ||
            !field.options.some((option) => Object.is(option.value, rawValue))
        ) {
            throw new Error(`A opção de "${field.label}" é inválida.`);
        }
        values[field.id] = rawValue;
    }

    return values;
}
