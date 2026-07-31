import "server-only";
import { AppError, type AppErrorCode } from "@/lib/errors/app-error";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database-types";

type BillRequestStatus = Database["public"]["Enums"]["bill_request_status"];

const PG_ERROR_TO_APP_ERROR: Record<string, AppErrorCode> = {
  P0002: "NOT_FOUND",
  IM009: "VALIDATION_ERROR",
  IM010: "INVALID_STATUS_TRANSITION",
  "42501": "FORBIDDEN",
};

/** Transição de status da solicitação de conta (docs/05, docs/11 AC-BILL-001). */
export async function transitionBillRequest(
  billRequestId: string,
  toStatus: BillRequestStatus,
  reason: string | undefined,
  requestId: string = crypto.randomUUID(),
) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("transition_bill_request_status", {
    p_bill_request_id: billRequestId,
    p_to_status: toStatus,
    ...(reason ? { p_reason: reason } : {}),
  });

  if (error) {
    const code = PG_ERROR_TO_APP_ERROR[error.code ?? ""] ?? "INTERNAL_ERROR";
    throw new AppError(code, { requestId });
  }

  return data;
}
