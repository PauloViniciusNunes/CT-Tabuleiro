import { useRef, useState } from "react";
import { UsersRound } from "lucide-react";

import type { PendingTransformationResolution } from "../../types/transformation";
import { BattleFormToggle } from "./BattleFormToggle";

interface TransformationFormProps {
  pending: PendingTransformationResolution;
  onSubmit: (templateId: string) => Promise<void>;
  onCancel: () => Promise<void>;
}

export default function TransformationForm({
  pending,
  onSubmit,
  onCancel,
}: TransformationFormProps) {
  const [visible, setVisible] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const lockRef = useRef(false);

  const resolve = async (action: "submit" | "cancel") => {
    if (lockRef.current || (action === "submit" && !selectedId)) return;
    lockRef.current = true;
    setSubmitting(true);
    try {
      if (action === "submit" && selectedId) await onSubmit(selectedId);
      else await onCancel();
    } catch (error) {
      console.error("Não foi possível resolver a transformação:", error);
      lockRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <>
      {visible && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
          <section className="w-full max-w-xl rounded-xl border border-emerald-500/60 bg-slate-950 p-5 text-white shadow-2xl">
            <header className="mb-4 flex items-center gap-3 text-emerald-300">
              <UsersRound className="h-7 w-7" aria-hidden="true" />
              <div>
                <h2 className="text-xl font-bold">Escolher transformação</h2>
                <p className="text-sm text-slate-400">
                  A vida e a mana atuais serão mantidas proporcionalmente.
                </p>
              </div>
            </header>

            <div className="grid max-h-[55vh] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
              {pending.options.map((option) => {
                const coolingDown = option.remainingRecharge > 0;
                const selected = selectedId === option.templateId;
                return (
                  <button
                    key={option.templateId}
                    type="button"
                    disabled={coolingDown || submitting}
                    onClick={() => setSelectedId(option.templateId)}
                    className={`flex min-w-0 items-center gap-3 rounded-lg border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-55 ${
                      selected
                        ? "border-emerald-300 bg-emerald-900/55"
                        : "border-slate-700 bg-slate-900 hover:border-emerald-600"
                    }`}
                  >
                    <img
                      src={option.imageUrl}
                      alt=""
                      className="h-16 w-16 shrink-0 rounded-md object-cover"
                    />
                    <span className="min-w-0">
                      <strong className="block truncate text-emerald-200">
                        {option.name}
                      </strong>
                      <span className="mt-1 block text-xs text-slate-400">
                        {coolingDown
                          ? `Recarga: ${option.remainingRecharge} round(s)`
                          : option.direction === "revert"
                            ? "Retornar à forma base"
                            : option.durationMode === "rounds"
                              ? `${option.durationRounds ?? 1} round(s) · recarga ${option.rechargeRounds}`
                              : "Persistente"}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            <footer className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                disabled={submitting}
                onClick={() => void resolve("cancel")}
                className="rounded-md border border-slate-600 px-4 py-2 text-slate-200 hover:bg-slate-800 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!selectedId || submitting}
                onClick={() => void resolve("submit")}
                className="rounded-md bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Transformando..." : "Transformar"}
              </button>
            </footer>
          </section>
        </div>
      )}
      <BattleFormToggle
        visible={visible}
        onToggle={() => setVisible((current) => !current)}
        label="formulário de transformação"
      />
    </>
  );
}
