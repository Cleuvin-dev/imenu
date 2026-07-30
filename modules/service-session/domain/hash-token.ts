import "server-only";
import { createHmac } from "node:crypto";
import { getServerEnv } from "@/lib/env";

/** HMAC-SHA256 do token do cookie — nunca persistimos o token bruto (docs/06 §5, docs/10). */
export function hashGuestToken(token: string): string {
  const env = getServerEnv();
  return createHmac("sha256", env.ANONYMOUS_SESSION_PEPPER).update(token).digest("hex");
}
