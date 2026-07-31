import "server-only";
import { AppError, type AppErrorCode } from "@/lib/errors/app-error";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const PG_ERROR_TO_APP_ERROR: Record<string, AppErrorCode> = {
  P0002: "NOT_FOUND",
  IM013: "OPEN_ORDERS_PENDING",
  "42501": "FORBIDDEN",
};

/**
 * Fecha a sessão de atendimento da mesa (docs/03 §regras 7-8, docs/05).
 * Bloqueia se houver pedido não terminal, a menos que `force=true`
 * (só owner/manager) — auditado no banco (ver close_table_session).
 */
export async function closeTableSession(
  tableServiceSessionId: string,
  force = false,
  requestId: string = crypto.randomUUID(),
) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("close_table_session", {
    p_table_service_session_id: tableServiceSessionId,
    p_force: force,
  });

  if (error) {
    const code = PG_ERROR_TO_APP_ERROR[error.code ?? ""] ?? "INTERNAL_ERROR";
    throw new AppError(code, { requestId });
  }

  return data;
}
