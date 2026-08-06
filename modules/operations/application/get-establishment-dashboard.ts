import "server-only";
import { AppError } from "@/lib/errors/app-error";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireTenantMembership } from "@/lib/auth/tenant";
import { businessDateInTimezone } from "@/lib/dates";
import { boardColumnFor } from "@/modules/operations/domain/board-columns";

export type EstablishmentDashboard = {
  ordersToday: {
    total: number;
    new: number;
    preparing: number;
    ready: number;
    delivered: number;
  };
  /** Tempo médio simples entre criação e entrega dos pedidos de hoje já entregues (docs/03 RF-EST-001). */
  averagePreparationMinutes: number | null;
  activeBillRequests: number;
};

/** Dashboard do estabelecimento (docs/03 RF-EST-001, docs/04 E-02). */
export async function getEstablishmentDashboard(
  establishmentId: string,
  requestId: string = crypto.randomUUID(),
): Promise<EstablishmentDashboard> {
  await requireTenantMembership(establishmentId, requestId);

  const supabase = await createSupabaseServerClient();

  const { data: establishment, error: establishmentError } = await supabase
    .from("establishments")
    .select("timezone")
    .eq("id", establishmentId)
    .single();

  if (establishmentError || !establishment) {
    throw new AppError("INTERNAL_ERROR", { requestId });
  }

  const today = businessDateInTimezone(new Date(), establishment.timezone);

  const [ordersResult, billRequestsResult] = await Promise.all([
    supabase
      .from("orders")
      .select("status, created_at, delivered_at")
      .eq("establishment_id", establishmentId)
      .eq("order_business_date", today),
    supabase
      .from("bill_requests")
      .select("id", { count: "exact", head: true })
      .eq("establishment_id", establishmentId)
      .in("status", ["requested", "acknowledged", "bill_delivered"]),
  ]);

  if (ordersResult.error || billRequestsResult.error) {
    throw new AppError("INTERNAL_ERROR", { requestId });
  }

  const orders = ordersResult.data ?? [];
  const ordersToday = { total: orders.length, new: 0, preparing: 0, ready: 0, delivered: 0 };
  const deliveredDurationsMs: number[] = [];

  for (const order of orders) {
    const column = boardColumnFor(order.status);
    if (column === "new") ordersToday.new += 1;
    if (column === "preparing") ordersToday.preparing += 1;
    if (column === "ready") ordersToday.ready += 1;
    if (column === "finished" && order.status === "delivered") {
      ordersToday.delivered += 1;
      if (order.delivered_at) {
        deliveredDurationsMs.push(new Date(order.delivered_at).getTime() - new Date(order.created_at).getTime());
      }
    }
  }

  const averagePreparationMinutes =
    deliveredDurationsMs.length > 0
      ? Math.round(deliveredDurationsMs.reduce((sum, ms) => sum + ms, 0) / deliveredDurationsMs.length / 60000)
      : null;

  return {
    ordersToday,
    averagePreparationMinutes,
    activeBillRequests: billRequestsResult.count ?? 0,
  };
}
