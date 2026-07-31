"use client";

import { useEffect, useState } from "react";
import { formatMoney } from "@/lib/money";
import { PUBLIC_BILL_REQUEST_STATUS_LABELS } from "@/modules/service-session/domain/bill-request-labels";
import type { TableBillStatus } from "@/modules/service-session/schemas/bill-request.schema";

const POLL_INTERVAL_MS = 8000;

type ValidStatus = Extract<TableBillStatus, { valid: true }>;

function isActive(status: string): boolean {
  return status === "requested" || status === "acknowledged" || status === "bill_delivered";
}

export function BillRequestClient({
  tableToken,
  initialStatus,
}: {
  tableToken: string;
  initialStatus: ValidStatus;
}) {
  const [status, setStatus] = useState<ValidStatus>(initialStatus);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const billRequest = status.session?.billRequest ?? null;
  const billActive = billRequest ? isActive(billRequest.status) : false;

  useEffect(() => {
    if (!billActive) return;

    const interval = setInterval(() => {
      fetch(`/api/public/bill-requests/${tableToken}`, { cache: "no-store" })
        .then((response) => (response.ok ? (response.json() as Promise<TableBillStatus>) : null))
        .then((data) => {
          if (data?.valid) setStatus(data);
        })
        .catch(() => {
          // Silencioso: mantém o último estado conhecido até a próxima tentativa.
        });
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [tableToken, billActive]);

  async function handleRequestBill() {
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/public/bill-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableToken, clientRequestId: crypto.randomUUID() }),
      });

      const payload: TableBillStatus & { message?: string } = await response.json();

      if (!response.ok || !payload.valid) {
        setError(payload.message ?? "Não foi possível solicitar a conta. Tente novamente.");
        setSubmitting(false);
        return;
      }

      setStatus(payload);
    } catch {
      setError("Não foi possível solicitar a conta. Verifique sua conexão e tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!status.session) {
    return (
      <div className="mx-auto flex max-w-md flex-col gap-4 px-4 py-16 text-center">
        <p className="text-sm text-neutral-600">Nenhum pedido feito nesta mesa ainda.</p>
      </div>
    );
  }

  const canRequest = status.session.status === "open" && !billActive;

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 px-4 py-8">
      <div>
        <h1 className="text-lg font-semibold text-neutral-950">Solicitar conta</h1>
        <p className="text-sm text-neutral-600">{status.establishmentTradeName}</p>
      </div>

      <div className="rounded-card border border-neutral-200 bg-white p-4">
        <p className="text-xs font-medium uppercase text-neutral-500">Total informativo</p>
        <p className="mt-1 text-2xl font-semibold text-neutral-950">{formatMoney(status.session.totalCents)}</p>
        <p className="mt-2 text-xs text-neutral-500">
          Valor calculado a partir dos pedidos desta mesa. Não é um comprovante fiscal.
        </p>
      </div>

      {billRequest ? (
        <div className="rounded-card border border-neutral-200 bg-white p-4" aria-live="polite">
          <p className="text-xs font-medium uppercase text-neutral-500">Status da solicitação</p>
          <p className="mt-1 text-lg font-semibold text-primary-700">
            {PUBLIC_BILL_REQUEST_STATUS_LABELS[billRequest.status]}
          </p>
          {billRequest.status === "canceled" && billRequest.cancellationReason ? (
            <p className="mt-2 text-sm text-neutral-600">Motivo: {billRequest.cancellationReason}</p>
          ) : null}
          {billActive ? <p className="mt-2 text-xs text-neutral-500">Atualizando automaticamente…</p> : null}
        </div>
      ) : null}

      {canRequest ? (
        <>
          <p className="text-sm text-neutral-600">A equipe levará a conta até sua mesa.</p>
          {error ? (
            <p role="alert" className="rounded-control bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          ) : null}
          <button
            type="button"
            onClick={handleRequestBill}
            disabled={submitting}
            className="w-full rounded-control bg-primary-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Enviando…" : "Solicitar conta"}
          </button>
        </>
      ) : null}
    </div>
  );
}
