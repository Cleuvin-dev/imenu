import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { resolveActiveEstablishment } from "@/modules/tenancy/application/resolve-active-establishment";
import { listOrders } from "@/modules/ordering/application/list-orders";
import { ORDER_STATUS_LABELS } from "@/modules/ordering/domain/order-status-labels";
import { formatMoney } from "@/lib/money";
import { formatDateTimePtBr } from "@/lib/dates";

export const metadata: Metadata = {
  title: "Pedidos — iMenu",
};

export default async function PedidosPage() {
  const resolution = await resolveActiveEstablishment();
  if (resolution.status !== "active") {
    redirect("/painel");
  }

  const orders = await listOrders(resolution.establishment.establishmentId);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold text-neutral-950">Pedidos</h1>
        <p className="text-sm text-neutral-600">Últimos 50 pedidos, mais recentes primeiro.</p>
      </div>

      {orders.length === 0 ? (
        <p className="text-sm text-neutral-600">Nenhum pedido recebido ainda.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                href={`/painel/pedidos/${order.id}`}
                className="flex items-center justify-between gap-3 rounded-card border border-neutral-200 bg-white p-4 transition hover:border-primary-600"
              >
                <div>
                  <p className="font-medium text-neutral-950">
                    Pedido {order.order_number} · Mesa {order.table?.name ?? "—"}
                  </p>
                  <p className="text-xs text-neutral-600">{formatDateTimePtBr(order.created_at)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-neutral-950">
                    {formatMoney(order.total_cents, order.currency)}
                  </p>
                  <span className="rounded-chip bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700">
                    {ORDER_STATUS_LABELS[order.status]}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
