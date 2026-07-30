import "server-only";
import { cookies, headers } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { extractClientIp, hashIp } from "@/lib/rate-limit/hash-ip";
import { GUEST_SESSION_COOKIE, GUEST_SESSION_MAX_AGE_SECONDS } from "@/modules/service-session/domain/guest-cookie";
import { hashGuestToken } from "@/modules/service-session/domain/hash-token";
import { publicMenuSchema, type PublicMenu } from "@/modules/service-session/schemas/public-menu.schema";

/**
 * Lê o cardápio público via RPC de leitura limitada e, quando válido,
 * registra/renova a sessão anônima da mesa. Falha fechado: qualquer erro,
 * limite de requisições excedido ou resposta inesperada vira
 * `{ valid: false }`, nunca um erro genérico que revele detalhes internos
 * (docs/11 AC-PUB-002).
 */
export async function getPublicMenu(establishmentSlug: string, tableToken: string): Promise<PublicMenu> {
  const headerList = await headers();
  const ipHash = hashIp(extractClientIp(headerList.get("x-forwarded-for")));
  const rateLimit = await checkRateLimit({
    key: `menu:${ipHash}:${tableToken}`,
    limit: 60,
    windowSeconds: 60,
  });
  if (!rateLimit.allowed) {
    return { valid: false };
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.rpc("get_public_menu", {
    p_establishment_slug: establishmentSlug,
    p_table_token: tableToken,
  });

  if (error) {
    return { valid: false };
  }

  const parsed = publicMenuSchema.safeParse(data);
  if (!parsed.success) {
    return { valid: false };
  }

  if (parsed.data.valid) {
    await registerGuestSession(parsed.data.establishment.id, parsed.data.table.id);
  }

  return parsed.data;
}

async function registerGuestSession(establishmentId: string, tableId: string): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(GUEST_SESSION_COOKIE)?.value;
  if (!token) {
    // O middleware garante o cookie nas rotas /m/*; sem ele, seguimos sem
    // sessão anônima nesta requisição em vez de falhar o cardápio inteiro.
    return;
  }

  const supabase = await createSupabaseServerClient();
  const expiresAt = new Date(Date.now() + GUEST_SESSION_MAX_AGE_SECONDS * 1000).toISOString();

  await supabase.rpc("ensure_guest_session", {
    p_establishment_id: establishmentId,
    p_table_id: tableId,
    p_token_hash: hashGuestToken(token),
    p_expires_at: expiresAt,
  });
}
