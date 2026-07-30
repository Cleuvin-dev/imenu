import "server-only";
import { getServerEnv } from "@/lib/env";
import { checkRateLimitInMemory, type RateLimitResult } from "@/lib/rate-limit/memory";

export type { RateLimitResult } from "@/lib/rate-limit/memory";
export { checkRateLimitInMemory } from "@/lib/rate-limit/memory";

/**
 * Limite de requisições para endpoints públicos (docs/08 §9, CLAUDE.md:
 * "Endpoints públicos devem validar ... limite de requisições"). Duas
 * implementações atrás da mesma interface, escolhidas por
 * RATE_LIMIT_PROVIDER: `memory` (padrão local/dev, um único processo) e
 * `upstash` (produção/múltiplas instâncias).
 */

async function upstashCommand(
  url: string,
  token: string,
  ...args: (string | number)[]
): Promise<number> {
  const path = args.map((arg) => encodeURIComponent(String(arg))).join("/");
  const response = await fetch(`${url}/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Upstash respondeu ${response.status}`);
  }

  const data = (await response.json()) as { result: number };
  return data.result;
}

async function checkRateLimitWithUpstash(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const env = getServerEnv();
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
    // getServerEnv() já garante isso quando RATE_LIMIT_PROVIDER=upstash;
    // guarda defensiva para não quebrar se alguém chamar fora desse caminho.
    return { allowed: true };
  }

  try {
    const count = await upstashCommand(env.UPSTASH_REDIS_REST_URL, env.UPSTASH_REDIS_REST_TOKEN, "INCR", key);
    if (count === 1) {
      await upstashCommand(env.UPSTASH_REDIS_REST_URL, env.UPSTASH_REDIS_REST_TOKEN, "EXPIRE", key, windowSeconds);
    }
    if (count > limit) {
      return { allowed: false, retryAfterSeconds: windowSeconds };
    }
    return { allowed: true };
  } catch {
    // O limite é uma segunda camada de defesa, não a única; se o provedor
    // externo cair, preferimos permitir a requisição a derrubar o cardápio
    // público inteiro por uma dependência de infraestrutura auxiliar.
    return { allowed: true };
  }
}

export async function checkRateLimit(params: {
  key: string;
  limit: number;
  windowSeconds: number;
}): Promise<RateLimitResult> {
  const env = getServerEnv();
  if (env.RATE_LIMIT_PROVIDER === "upstash") {
    return checkRateLimitWithUpstash(params.key, params.limit, params.windowSeconds);
  }
  return checkRateLimitInMemory(params.key, params.limit, params.windowSeconds);
}
