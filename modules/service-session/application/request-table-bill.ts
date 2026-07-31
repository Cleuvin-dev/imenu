import "server-only";
import { cookies } from "next/headers";
import { AppError, type AppErrorCode } from "@/lib/errors/app-error";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  GUEST_SESSION_COOKIE,
  GUEST_SESSION_MAX_AGE_SECONDS,
  generateOpaqueToken,
} from "@/modules/service-session/domain/guest-cookie";
import { hashGuestToken } from "@/modules/service-session/domain/hash-token";
import { requestTableBillSchema, tableBillStatusSchema } from "@/modules/service-session/schemas/bill-request.schema";

const PG_ERROR_TO_APP_ERROR: Record<string, AppErrorCode> = {
  IM001: "INVALID_TABLE_TOKEN",
  IM003: "ESTABLISHMENT_SUSPENDED",
  IM011: "NO_ACTIVE_SESSION",
};

/**
 * Solicita a conta da sessão aberta da mesa (docs/03 §regras 4-6, docs/08
 * §2). Idempotente por sessão: retries de qualquer dispositivo da mesma
 * mesa devolvem a mesma solicitação ativa em vez de criar outra
 * (AC-BILL-002) — a garantia real está no índice único parcial do banco,
 * não no `clientRequestId` em si.
 */
export async function requestTableBill(
  input: unknown,
  requestId: string = crypto.randomUUID(),
): Promise<ReturnType<typeof tableBillStatusSchema.parse>> {
  const parsed = requestTableBillSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", { requestId, fieldErrors: parsed.error.flatten().fieldErrors });
  }

  const cookieStore = await cookies();
  let guestToken = cookieStore.get(GUEST_SESSION_COOKIE)?.value;
  if (!guestToken) {
    guestToken = generateOpaqueToken();
    cookieStore.set(GUEST_SESSION_COOKIE, guestToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: GUEST_SESSION_MAX_AGE_SECONDS,
    });
  }

  const guestTokenHash = hashGuestToken(guestToken);

  const rateLimit = await checkRateLimit({
    key: `bill-request:${parsed.data.tableToken}:${guestTokenHash}`,
    limit: 3,
    windowSeconds: 600,
  });
  if (!rateLimit.allowed) {
    throw new AppError("RATE_LIMITED", { requestId });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("request_table_bill", {
    p_table_token: parsed.data.tableToken,
    p_guest_token_hash: guestTokenHash,
    p_client_request_id: parsed.data.clientRequestId,
  });

  if (error) {
    const code = PG_ERROR_TO_APP_ERROR[error.code ?? ""] ?? "INTERNAL_ERROR";
    throw new AppError(code, { requestId });
  }

  return tableBillStatusSchema.parse(data);
}
