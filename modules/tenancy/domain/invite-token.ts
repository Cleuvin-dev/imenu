import "server-only";
import { randomBytes, createHmac } from "node:crypto";
import { getServerEnv } from "@/lib/env";

/** Convite expira em 72 horas (docs/02 §5, regra 5). */
export const INVITE_EXPIRATION_MS = 72 * 60 * 60 * 1000;

/** Token bruto do convite — só existe em memória/URL, nunca persistido. */
export function generateInviteToken(): string {
  return randomBytes(24).toString("hex");
}

/** HMAC-SHA256 do token — o único valor gravado em member_invites.token_hash. */
export function hashInviteToken(token: string): string {
  const env = getServerEnv();
  return createHmac("sha256", env.INVITE_TOKEN_PEPPER).update(token).digest("hex");
}
