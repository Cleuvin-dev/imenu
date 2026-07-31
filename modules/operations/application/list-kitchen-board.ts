import "server-only";
import { AppError } from "@/lib/errors/app-error";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database-types";

type OrderStatus = Database["public"]["Enums"]["order_status"];

const OPEN_STATUSES: readonly OrderStatus[] = ["pending", "accepted", "preparing", "ready"];
const OPERATIONAL_WINDOW_MS = 24 * 60 * 60 * 1000;
const ORDER_SELECT =
  "id, order_number, status, created_at, rejection_reason, cancellation_reason, table:dining_tables(name)";

export type KitchenBoardOrder = {
  id: string;
  order_number: string;
  status: OrderStatus;
  created_at: string;
  rejection_reason: string | null;
  cancellation_reason: string | null;
  table: { name: string } | null;
  items: {
    id: string;
    product_name_snapshot: string;
    quantity: number;
    notes: string | null;
    options: { group_name_snapshot: string; option_name_snapshot: string }[];
  }[];
};

/**
 * Snapshot do KDS: últimas 24h + qualquer pedido ainda aberto fora dessa
 * janela (docs/06 §7 — "queries operacionais limitadas a janela relevante").
 * Evita N+1 buscando itens/opções em lote pelos IDs já carregados.
 */
export async function listKitchenBoardOrders(
  establishmentId: string,
  requestId: string = crypto.randomUUID(),
): Promise<KitchenBoardOrder[]> {
  const supabase = await createSupabaseServerClient();
  const windowStart = new Date(Date.now() - OPERATIONAL_WINDOW_MS).toISOString();

  const [recent, staleOpen] = await Promise.all([
    supabase
      .from("orders")
      .select(ORDER_SELECT)
      .eq("establishment_id", establishmentId)
      .gte("created_at", windowStart)
      .order("created_at", { ascending: true })
      .limit(200),
    supabase
      .from("orders")
      .select(ORDER_SELECT)
      .eq("establishment_id", establishmentId)
      .lt("created_at", windowStart)
      .in("status", OPEN_STATUSES)
      .order("created_at", { ascending: true })
      .limit(200),
  ]);

  if (recent.error || staleOpen.error) {
    throw new AppError("INTERNAL_ERROR", { requestId });
  }

  const orders = [...(staleOpen.data ?? []), ...(recent.data ?? [])];
  const orderIds = orders.map((order) => order.id);

  if (orderIds.length === 0) {
    return [];
  }

  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select("id, order_id, product_name_snapshot, quantity, notes")
    .in("order_id", orderIds)
    .order("created_at");

  if (itemsError) {
    throw new AppError("INTERNAL_ERROR", { requestId });
  }

  const itemIds = (items ?? []).map((item) => item.id);
  const { data: options } =
    itemIds.length > 0
      ? await supabase
          .from("order_item_options")
          .select("order_item_id, group_name_snapshot, option_name_snapshot")
          .in("order_item_id", itemIds)
      : { data: [] };

  return orders.map((order) => ({
    ...order,
    items: (items ?? [])
      .filter((item) => item.order_id === order.id)
      .map((item) => ({
        id: item.id,
        product_name_snapshot: item.product_name_snapshot,
        quantity: item.quantity,
        notes: item.notes,
        options: (options ?? [])
          .filter((option) => option.order_item_id === item.id)
          .map((option) => ({
            group_name_snapshot: option.group_name_snapshot,
            option_name_snapshot: option.option_name_snapshot,
          })),
      })),
  }));
}
