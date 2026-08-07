"use client";

import { useEffect } from "react";
import "./globals.css";

/**
 * Boundary de erro raiz do App Router — captura qualquer exceção não
 * tratada que escape de todos os outros boundaries (docs/13 §6, captura de
 * exceções do lado cliente). Reporta ao endpoint interno de log, sem expor
 * detalhes internos na tela (docs/16 §5 "erros não expõem internals").
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    fetch("/api/internal/log-client-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: error.message.slice(0, 500),
        digest: error.digest,
        path: typeof window !== "undefined" ? window.location.pathname : undefined,
      }),
      keepalive: true,
    }).catch(() => {
      // Falha ao reportar não pode virar um segundo erro na tela de erro.
    });
  }, [error]);

  return (
    <html lang="pt-BR">
      <body>
        <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 py-24 text-center">
          <span className="rounded-chip bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700">iMenu</span>
          <h1 className="text-xl font-semibold text-neutral-950">Algo deu errado</h1>
          <p className="max-w-md text-sm text-neutral-600">
            Ocorreu um erro inesperado. Nossa equipe já foi notificada. Tente novamente em alguns instantes.
          </p>
          <button
            type="button"
            onClick={reset}
            className="rounded-control bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700"
          >
            Tentar novamente
          </button>
        </main>
      </body>
    </html>
  );
}
