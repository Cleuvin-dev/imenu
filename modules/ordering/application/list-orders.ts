import "server-only";
import { AppError } from "@/lib/errors/app-error";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function listOrders(establishmentId: string, requestId: string = crypto.randomUUID()) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("orders")
    .select("id, order_number, status, total_cents, currency, created_at, table:dining_tables(name)")
    .eq("establishment_id", establishmentId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    throw new AppError("INTERNAL_ERROR", { requestId });
  }

  return data;
}
