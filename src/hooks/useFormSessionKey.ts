import { useEffect, useRef, useState } from "react";

/**
 * Produz uma chave nova quando uma solicitação transitória do combate chega.
 *
 * Formulários de combate mantêm locks locais para impedir cliques duplicados.
 * Uma nova solicitação pode, entretanto, reutilizar o mesmo componente React
 * (inclusive para o mesmo token). A chave força uma nova sessão visual e evita
 * que o lock da solicitação anterior apareça como "Processando..." na próxima.
 */
export function useFormSessionKey(prefix: string, payload: unknown): string {
  const previousPayload = useRef(payload);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (Object.is(previousPayload.current, payload)) {
      return;
    }

    previousPayload.current = payload;

    if (payload !== null && payload !== undefined) {
      setRevision((current) => current + 1);
    }
  }, [payload]);

  return `${prefix}:${revision}`;
}
