import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { resolveActiveEstablishment } from "@/modules/tenancy/application/resolve-active-establishment";
import { getOrder } from "@/modules/ordering/application/get-order";
import { ORDER_STATUS_LABELS } from "@/modules/ordering/domain/order-status-labels";
import { allowedTransitionsFor } from "@/modules/ordering/domain/transitions";
import { formatMoney } from "@/lib/money";
import { formatDateTimePtBr } from "@/lib/dates";
import { TransitionOrderForm } from "./transition-order-form";

export const metadata: Metadata = {
  title: "Pedido — iMenu",
};

export default async function PedidoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolution = await resolveActiveEstablishment();
  if (resolution.status !== "active") {
    redirect("/painel");
  }

  const { id } = await params;
  const detail = await getOrder(id);

  if (!detail || detail.order.establishment_id !== resolution.establishment.establishmentId) {
    notFound();
  }

  const { order, items, history } = detail;
  const transitions = allowedTransitionsFor(order.status, resolution.establishment.role);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold text-neutral-950">Pedido {order.order_number}</h1>
        <p className="text-sm text-neutral-600">
          Mesa {order.table?.name ?? "—"} · {formatDateTimePtBr(order.created_at)}
        </p>
      </div>

      <section className="rounded-card border border-neutral-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <span className="rounded-chip bg-primary-50 px-3 py-1 text-sm font-medium text-primary-700">
            {ORDER_STATUS_LABELS[order.status]}
          </span>
          <p className="text-sm font-semibold text-neutral-950">{formatMoney(order.total_cents, order.currency)}</p>
        </div>

        {order.rejection_reason ? (
          <p className="mt-2 text-sm text-neutral-600">Motivo da rejeição: {order.rejection_reason}</p>
        ) : null}
        {order.cancellation_reason ? (
          <p className="mt-2 text-sm text-neutral-600">Motivo do cancelamento: {order.cancellation_reason}</p>
        ) : null}

        {transitions.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-3 border-t border-neutral-200 pt-4">
            {transitions.map((rule) => (
              <TransitionOrderForm
                key={rule.to}
                orderId={order.id}
                toStatus={rule.to}
                label={ORDER_STATUS_LABELS[rule.to]}
                requiresReason={rule.requiresReason}
              />
            ))}
          </div>
        ) : null}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-neutral-950">Itens</h2>
        {items.map((item) => (
          <div key={item.id} className="rounded-card border border-neutral-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <p className="font-medium text-neutral-950">
                {item.quantity}x {item.product_name_snapshot}
              </p>
              <p className="text-sm font-semibold text-neutral-950">{formatMoney(item.line_total_cents)}</p>
            </div>
            {item.options.length > 0 ? (
              <p className="text-xs text-neutral-600">
                {item.options.map((option) => `${option.group_name_snapshot}: ${option.option_name_snapshot}`).join(" · ")}
              </p>
            ) : null}
            {item.notes ? <p className="text-xs italic text-neutral-500">&ldquo;{item.notes}&rdquo;</p> : null}
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-neutral-950">Histórico</h2>
        <ul className="flex flex-col gap-1">
          {history.map((entry, index) => (
            <li key={index} className="flex items-center justify-between text-xs text-neutral-600">
              <span>
                {entry.from_status ? `${ORDER_STATUS_LABELS[entry.from_status]} → ` : ""}
                {ORDER_STATUS_LABELS[entry.to_status]}
                {entry.reason ? ` — ${entry.reason}` : ""}
              </span>
              <span>{formatDateTimePtBr(entry.created_at)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
