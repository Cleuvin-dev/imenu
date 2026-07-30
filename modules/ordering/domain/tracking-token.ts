import "server-only";
import { createHmac } from "node:crypto";
import { getServerEnv } from "@/lib/env";

/**
 * HMAC determinístico do clientRequestId — funciona como o próprio token
 * de rastreamento público do pedido (ver create_public_order). Sendo
 * determinístico, um retry com o mesmo clientRequestId recalcula o mesmo
 * valor sem precisar reler nada do banco (AC-ORD-005): o "hash" armazenado
 * em orders.public_tracking_token_hash é usado diretamente como o token,
 * já que só quem conhece a pimenta consegue derivá-lo a partir do
 * clientRequestId (que o próprio cliente já conhece, mas não basta sozinho).
 */
export function computeOrderTrackingToken(clientRequestId: string): string {
  const env = getServerEnv();
  return createHmac("sha256", env.ORDER_TRACKING_TOKEN_PEPPER).update(clientRequestId).digest("hex");
}
