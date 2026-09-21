import { useEffect, useState, type FormEvent } from "react";
import type {
  PendingSpecialResponse,
  SpecialResponseValues,
} from "../../types/specialResponse";

interface SpecialResponseFormProps {
  pending: PendingSpecialResponse;
  onSubmit: (values: SpecialResponseValues) => Promise<void>;
  onCancel: () => Promise<void>;
}

function initialValues(pending: PendingSpecialResponse): SpecialResponseValues {
  return Object.fromEntries(pending.fields.map((field) => {
    if (field.defaultValue !== undefined) return [field.id, field.defaultValue];
    if (field.type === "select") return [field.id, field.options[0]?.value ?? ""];
    return [field.id, ""];
  }));
}

export default function SpecialResponseForm({
  pending,
  onSubmit,
  onCancel,
}: SpecialResponseFormProps) {
  const [values, setValues] = useState<SpecialResponseValues>(() => initialValues(pending));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setValues(initialValues(pending));
    setSubmitting(false);
    setError(null);
  }, [pending]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const normalized = Object.fromEntries(pending.fields.flatMap((field) => {
        const value = values[field.id];
        if (value === "" && field.required === false) return [];
        return [[field.id, field.type === "number" ? Number(value) : value]];
      }));
      await onSubmit(normalized);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível enviar a resposta.");
      setSubmitting(false);
    }
  }

  async function handleCancel() {
    setSubmitting(true);
    setError(null);
    try {
      await onCancel();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível cancelar a resposta.");
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl border border-orange-400/70 bg-slate-900 p-5 text-slate-100 shadow-2xl shadow-black/60"
        role="dialog"
        aria-modal="true"
        aria-labelledby="special-response-title"
      >
        <div className="mb-5">
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-orange-300">
            Resposta especial
          </p>
          <h2 id="special-response-title" className="text-xl font-bold text-white">
            {pending.title}
          </h2>
          {pending.description && (
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              {pending.description}
            </p>
          )}
        </div>

        <div className="space-y-4">
          {pending.fields.map((field) => (
            <label key={field.id} className="flex flex-col gap-1.5 text-sm font-medium">
              <span>{field.label}</span>
              {field.type === "number" ? (
                <input
                  type="number"
                  value={values[field.id] ?? ""}
                  min={field.min}
                  max={field.max}
                  step={field.step ?? (field.integer ? 1 : "any")}
                  required={field.required !== false}
                  disabled={submitting}
                  onChange={(event) => setValues((current) => ({
                    ...current,
                    [field.id]: event.target.value,
                  }))}
                  className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20"
                />
              ) : (
                <select
                  value={field.options.findIndex((option) =>
                    Object.is(option.value, values[field.id]),
                  )}
                  required={field.required !== false}
                  disabled={submitting}
                  onChange={(event) => {
                    const option = field.options[Number(event.target.value)];
                    if (!option) return;
                    setValues((current) => ({ ...current, [field.id]: option.value }));
                  }}
                  className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20"
                >
                  {field.options.map((option, index) => (
                    <option key={`${typeof option.value}:${option.value}`} value={index}>
                      {option.label}
                    </option>
                  ))}
                </select>
              )}
            </label>
          ))}
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded-lg border border-red-500/50 bg-red-950/50 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        )}

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleCancel}
            disabled={submitting}
            className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 font-semibold transition hover:bg-slate-700 disabled:cursor-wait disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg border border-orange-300/60 bg-orange-600 px-4 py-2 font-semibold transition hover:bg-orange-500 disabled:cursor-wait disabled:opacity-60"
          >
            {submitting
              ? "Enviando..."
              : pending.fields.length === 0
                ? "Confirmar"
                : "Enviar"}
          </button>
        </div>
      </form>
    </div>
  );
}
