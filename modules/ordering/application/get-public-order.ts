import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { publicOrderStatusSchema, type PublicOrderStatus } from "@/modules/ordering/schemas/public-order-status.schema";

/**
 * Leitura pública do acompanhamento do pedido (docs/08 §2). Fail-closed:
 * qualquer erro, limite excedido ou token desconhecido vira
 * `{ valid: false }`, nunca revela se o pedido existe.
 */
export async function getPublicOrderStatus(trackingToken: string): Promise<PublicOrderStatus> {
  const rateLimit = await checkRateLimit({
    key: `order-status:${trackingToken}`,
    limit: 60,
    windowSeconds: 60,
  });
  if (!rateLimit.allowed) {
    return { valid: false };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_public_order", { p_tracking_token_hash: trackingToken });

  if (error) {
    return { valid: false };
  }

  const parsed = publicOrderStatusSchema.safeParse(data);
  if (!parsed.success) {
    return { valid: false };
  }

  return parsed.data;
}
