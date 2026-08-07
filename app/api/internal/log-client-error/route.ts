import "server-only";
import { z } from "zod";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logging";
import { checkRateLimit } from "@/lib/rate-limit";
import { hashIp, extractClientIp } from "@/lib/rate-limit/hash-ip";

const clientErrorSchema = z.object({
  message: z.string().trim().min(1).max(500),
  digest: z.string().trim().max(100).optional(),
  path: z.string().trim().max(300).optional(),
});

/**
 * Captura de exceções do lado cliente (docs/13 §6) — recebe o relato de
 * `app/global-error.tsx`. Nunca aceita stack trace completo do navegador
 * (poderia incluir dados sensíveis do estado da página); só mensagem,
 * digest do Next.js e caminho.
 */
export async function POST(request: Request): Promise<Response> {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  const ip = hashIp(extractClientIp(request.headers.get("x-forwarded-for")));

  const rateLimit = await checkRateLimit({ key: `log-client-error:${ip}`, limit: 20, windowSeconds: 60 });
  if (!rateLimit.allowed) {
    return NextResponse.json({ code: "RATE_LIMITED" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const parsed = clientErrorSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ code: "VALIDATION_ERROR" }, { status: 400 });
  }

  logger.error(parsed.data.message, {
    requestId,
    route: parsed.data.path,
    event: "unhandled_client_error",
    digest: parsed.data.digest,
  });

  return NextResponse.json({ status: "logged" }, { status: 202 });
}
