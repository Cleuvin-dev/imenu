import "server-only";
import { AppError, type AppErrorCode } from "@/lib/errors/app-error";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database-types";

type OrderStatus = Database["public"]["Enums"]["order_status"];

const PG_ERROR_TO_APP_ERROR: Record<string, AppErrorCode> = {
  P0002: "NOT_FOUND",
  IM009: "VALIDATION_ERROR",
  IM010: "INVALID_STATUS_TRANSITION",
  "42501": "FORBIDDEN",
};

/** Transição de status validada e auditada no banco (docs/05 §3, AC-ORD-007/008). */
export async function transitionOrder(
  orderId: string,
  toStatus: OrderStatus,
  reason: string | undefined,
  requestId: string = crypto.randomUUID(),
) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("transition_order_status", {
    p_order_id: orderId,
    p_to_status: toStatus,
    ...(reason ? { p_reason: reason } : {}),
  });

  if (error) {
    const code = PG_ERROR_TO_APP_ERROR[error.code ?? ""] ?? "INTERNAL_ERROR";
    throw new AppError(code, { requestId });
  }

  return data;
}
