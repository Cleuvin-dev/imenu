import "server-only";
import { createHmac } from "node:crypto";
import { getServerEnv } from "@/lib/env";

/** HMAC-SHA256 do IP do requisitante — nunca logamos/chaveamos pelo IP em texto puro (docs/08 §10, docs/10). */
export function hashIp(ip: string): string {
  const env = getServerEnv();
  return createHmac("sha256", env.IP_HASH_PEPPER).update(ip).digest("hex");
}

/** Primeiro IP da cadeia `x-forwarded-for`; `"unknown"` quando ausente (dev local sem proxy). */
export function extractClientIp(headerValue: string | null): string {
  if (!headerValue) return "unknown";
  return headerValue.split(",")[0]?.trim() || "unknown";
}
