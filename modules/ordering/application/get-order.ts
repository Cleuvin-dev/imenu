import "server-only";
import { AppError } from "@/lib/errors/app-error";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getOrder(orderId: string, requestId: string = crypto.randomUUID()) {
  const supabase = await createSupabaseServerClient();

  const { data: order, error } = await supabase
    .from("orders")
    .select("*, table:dining_tables(name)")
    .eq("id", orderId)
    .maybeSingle();

  if (error) {
    throw new AppError("INTERNAL_ERROR", { requestId });
  }
  if (!order) {
    return null;
  }

  const { data: items } = await supabase
    .from("order_items")
    .select("id, product_name_snapshot, quantity, notes, unit_total_cents, line_total_cents")
    .eq("order_id", orderId)
    .order("created_at");

  const itemIds = (items ?? []).map((item) => item.id);

  const { data: options } =
    itemIds.length > 0
      ? await supabase
          .from("order_item_options")
          .select("order_item_id, group_name_snapshot, option_name_snapshot, unit_price_delta_cents")
          .in("order_item_id", itemIds)
      : { data: [] };

  const { data: history } = await supabase
    .from("order_status_history")
    .select("from_status, to_status, reason, created_at")
    .eq("order_id", orderId)
    .order("created_at");

  return {
    order,
    items: (items ?? []).map((item) => ({
      ...item,
      options: (options ?? []).filter((option) => option.order_item_id === item.id),
    })),
    history: history ?? [],
  };
}

export type OrderDetail = NonNullable<Awaited<ReturnType<typeof getOrder>>>;
