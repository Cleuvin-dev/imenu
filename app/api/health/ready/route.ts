import "server-only";
import { NextResponse } from "next/server";
import { getPublicEnv } from "@/lib/env/public";

const READY_TIMEOUT_MS = 3000;

/**
 * Readiness (docs/13 §7): confirma conectividade essencial com o Supabase
 * com timeout curto. Usa só a chave anônima (nunca a service role) e nunca
 * revela versão interna, chave ou schema — só `ok`/`degraded`.
 */
export async function GET(): Promise<Response> {
  const env = getPublicEnv();

  try {
    const response = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/plans?select=id&limit=1`, {
      headers: {
        apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      },
      signal: AbortSignal.timeout(READY_TIMEOUT_MS),
    });

    if (!response.ok) {
      return NextResponse.json({ status: "degraded" }, { status: 503 });
    }

    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch {
    return NextResponse.json({ status: "degraded" }, { status: 503 });
  }
}
