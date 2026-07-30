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
import { createOrderSchema, publicOrderCreatedSchema } from "@/modules/ordering/schemas/create-order.schema";
import { computeOrderPayloadHash } from "@/modules/ordering/domain/payload-hash";
import { computeOrderTrackingToken } from "@/modules/ordering/domain/tracking-token";

/** Mapeia os errcodes customizados de create_public_order (docs/08 §5). */
const PG_ERROR_TO_APP_ERROR: Record<string, AppErrorCode> = {
  IM001: "INVALID_TABLE_TOKEN",
  IM003: "ESTABLISHMENT_SUSPENDED",
  IM004: "ORDERS_CLOSED",
  IM005: "PRODUCT_UNAVAILABLE",
  IM006: "PRICE_CHANGED",
  IM007: "INVALID_OPTION_SELECTION",
  IM008: "IDEMPOTENCY_CONFLICT",
  IM009: "VALIDATION_ERROR",
};

/**
 * Cria o pedido real a partir do carrinho (docs/05 §2, docs/11 AC-ORD-001 a
 * 006). Nunca confia no total enviado pelo navegador: o preço é sempre
 * recalculado dentro de create_public_order a partir do catálogo atual.
 * Só recebe o tableToken (docs/08 §2) — o token já é globalmente único, então
 * o estabelecimento é sempre derivado dele dentro da função, nunca de um
 * slug enviado separadamente pelo cliente.
 */
export async function createPublicOrder(
  input: unknown,
  requestId: string = crypto.randomUUID(),
): Promise<ReturnType<typeof publicOrderCreatedSchema.parse>> {
  const parsed = createOrderSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", { requestId, fieldErrors: parsed.error.flatten().fieldErrors });
  }

  const cookieStore = await cookies();
  let guestToken = cookieStore.get(GUEST_SESSION_COOKIE)?.value;
  if (!guestToken) {
    // proxy.ts cobre apenas /m/*; como defesa extra, garantimos o cookie
    // aqui também para o caso raro de o carrinho ser enviado sem ele.
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
    key: `orders:${parsed.data.tableToken}:${guestTokenHash}`,
    limit: 10,
    windowSeconds: 300,
  });
  if (!rateLimit.allowed) {
    throw new AppError("RATE_LIMITED", { requestId });
  }

  const payloadHash = computeOrderPayloadHash(parsed.data);
  const trackingToken = computeOrderTrackingToken(parsed.data.clientRequestId);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("create_public_order", {
    p_table_token: parsed.data.tableToken,
    p_guest_token_hash: guestTokenHash,
    p_client_request_id: parsed.data.clientRequestId,
    p_payload_hash: payloadHash,
    p_tracking_token_hash: trackingToken,
    // Omitido (em vez de null) quando ausente: o parâmetro RPC é opcional e
    // usa o default do banco nesse caso (ver docs/08 — expectedTotalCents só
    // detecta PRICE_CHANGED, nunca é usado para calcular o total).
    ...(parsed.data.expectedTotalCents !== undefined
      ? { p_expected_total_cents: parsed.data.expectedTotalCents }
      : {}),
    p_items: parsed.data.items,
  });

  if (error) {
    const code = PG_ERROR_TO_APP_ERROR[error.code ?? ""] ?? "INTERNAL_ERROR";
    throw new AppError(code, { requestId });
  }

  return publicOrderCreatedSchema.parse(data);
}
