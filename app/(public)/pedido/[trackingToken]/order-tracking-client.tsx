"use client";

import { useEffect, useState } from "react";
import { formatMoney } from "@/lib/money";
import { formatDateTimePtBr } from "@/lib/dates";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/modules/ordering/domain/order-status-labels";
import type { PublicOrderStatus } from "@/modules/ordering/schemas/public-order-status.schema";

const POLL_INTERVAL_MS = 8000;

type ValidStatus = Extract<PublicOrderStatus, { valid: true }>;

function statusLabel(status: string): string {
  return ORDER_STATUS_LABELS[status as OrderStatus] ?? status;
}

export function OrderTrackingClient({
  trackingToken,
  initialStatus,
}: {
  trackingToken: string;
  initialStatus: ValidStatus;
}) {
  const [status, setStatus] = useState<ValidStatus>(initialStatus);

  useEffect(() => {
    const { order } = status;
    if (order.status === "delivered" || order.status === "rejected" || order.status === "canceled") {
      return;
    }

    const interval = setInterval(() => {
      fetch(`/api/public/orders/${trackingToken}`, { cache: "no-store" })
        .then((response) => (response.ok ? (response.json() as Promise<PublicOrderStatus>) : null))
        .then((data) => {
          if (data?.valid) {
            setStatus(data);
          }
        })
        .catch(() => {
          // Silencioso: mantém o último estado conhecido até a próxima tentativa.
        });
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [trackingToken, status]);

  const { order } = status;
  const isTerminal = order.status === "delivered" || order.status === "rejected" || order.status === "canceled";

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4">
      <div>
        <span className="rounded-chip bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700">iMenu</span>
        <h1 className="mt-2 text-lg font-semibold text-neutral-950">Pedido {order.number}</h1>
        {order.tableName ? <p className="text-sm text-neutral-600">Mesa {order.tableName}</p> : null}
      </div>

      <div className="rounded-card border border-neutral-200 bg-white p-4" aria-live="polite">
        <p className="text-xs font-medium uppercase text-neutral-500">Status atual</p>
        <p className="mt-1 text-lg font-semibold text-primary-700">{statusLabel(order.status)}</p>
        {order.status === "rejected" && order.rejectionReason ? (
          <p className="mt-2 text-sm text-neutral-600">Motivo: {order.rejectionReason}</p>
        ) : null}
        {order.status === "canceled" && order.cancellationReason ? (
          <p className="mt-2 text-sm text-neutral-600">Motivo: {order.cancellationReason}</p>
        ) : null}
        {!isTerminal ? <p className="mt-2 text-xs text-neutral-500">Atualizando automaticamente…</p> : null}
      </div>

      <div className="rounded-card border border-neutral-200 bg-white p-4">
        <p className="text-sm font-semibold text-neutral-950">Itens</p>
        <ul className="mt-2 flex flex-col gap-2">
          {order.items.map((item, index) => (
            <li key={index} className="text-sm text-neutral-700">
              <div className="flex items-center justify-between">
                <span>
                  {item.quantity}x {item.name}
                </span>
                <span>{formatMoney(item.lineTotalCents)}</span>
              </div>
              {item.options.length > 0 ? (
                <p className="text-xs text-neutral-500">{item.options.map((option) => option.optionName).join(", ")}</p>
              ) : null}
              {item.notes ? <p className="text-xs italic text-neutral-500">&ldquo;{item.notes}&rdquo;</p> : null}
            </li>
          ))}
        </ul>
        <div className="mt-3 flex items-center justify-between border-t border-neutral-200 pt-3 text-sm font-semibold text-neutral-950">
          <span>Total</span>
          <span>{formatMoney(order.totalCents, order.currency)}</span>
        </div>
      </div>

      <div className="rounded-card border border-neutral-200 bg-white p-4">
        <p className="text-sm font-semibold text-neutral-950">Linha do tempo</p>
        <ul className="mt-2 flex flex-col gap-1">
          {order.timeline.map((entry, index) => (
            <li key={index} className="flex items-center justify-between text-xs text-neutral-600">
              <span>{statusLabel(entry.toStatus)}</span>
              <span>{formatDateTimePtBr(entry.createdAt)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
