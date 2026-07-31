import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { resolveActiveEstablishment } from "@/modules/tenancy/application/resolve-active-establishment";
import { listKitchenBoardOrders } from "@/modules/operations/application/list-kitchen-board";
import { KitchenBoard } from "@/app/(establishment)/painel/pedidos/kitchen-board";

export const metadata: Metadata = {
  title: "KDS — Pedidos — iMenu",
};

export default async function PedidosPage() {
  const resolution = await resolveActiveEstablishment();
  if (resolution.status !== "active") {
    redirect("/painel");
  }

  const { establishmentId, role } = resolution.establishment;
  const orders = await listKitchenBoardOrders(establishmentId);

  return <KitchenBoard establishmentId={establishmentId} role={role} initialOrders={orders} />;
}
