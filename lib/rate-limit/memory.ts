/**
 * Backend em memória do rate limit — separado de index.ts (que importa
 * "server-only") para poder ser testado por unidade sem depender do
 * shim especial que só o bundler do Next.js resolve.
 */
export type RateLimitResult = { allowed: boolean; retryAfterSeconds?: number };

type MemoryBucket = { count: number; resetAt: number };

const memoryStore = new Map<string, MemoryBucket>();

export function checkRateLimitInMemory(
  key: string,
  limit: number,
  windowSeconds: number,
  now: number = Date.now(),
): RateLimitResult {
  const bucket = memoryStore.get(key);

  if (!bucket || bucket.resetAt <= now) {
    memoryStore.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { allowed: true };
  }

  if (bucket.count >= limit) {
    return { allowed: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  return { allowed: true };
}
