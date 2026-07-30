import "server-only";
import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getServerEnv } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Job de inadimplência (docs/09 §5). Exige o segredo de cron e nunca aceita
 * invocação de navegador autenticado — não há verificação de sessão de
 * usuário aqui, só o segredo compartilhado com o agendador.
 */

function safeCompare(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

function extractProvidedSecret(request: Request): string | null {
  const headerSecret = request.headers.get("x-cron-secret");
  if (headerSecret) return headerSecret;

  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length);
  }

  return null;
}

async function handle(request: Request): Promise<Response> {
  const env = getServerEnv();
  const provided = extractProvidedSecret(request);

  if (!provided || !safeCompare(provided, env.CRON_SECRET)) {
    return NextResponse.json(
      { code: "UNAUTHENTICATED", message: "Segredo de cron ausente ou inválido." },
      { status: 401 },
    );
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc("process_overdue_subscriptions", {});

  if (error) {
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Falha ao processar assinaturas vencidas." },
      { status: 500 },
    );
  }

  return NextResponse.json(data);
}

export async function POST(request: Request): Promise<Response> {
  return handle(request);
}

export async function GET(request: Request): Promise<Response> {
  return handle(request);
}
