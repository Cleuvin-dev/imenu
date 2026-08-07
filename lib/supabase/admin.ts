import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getServerEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/database-types";

/**
 * Cliente com service role — ignora RLS. Uso restrito a rotinas de servidor
 * bem delimitadas (cron autenticado, funções administrativas internas que já
 * validaram autorização). Nunca importar este módulo em código que também
 * seja importado por um componente de cliente.
 */
export function createSupabaseAdminClient() {
  const env = getServerEnv();

  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY não configurada. Necessária para operações administrativas/cron " +
        "(ver bloqueio registrado em status/IMPLEMENTATION_STATUS.md).",
    );
  }

  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      // Mesmo motivo do cliente de servidor (lib/supabase/server.ts): o
      // Data Cache do Next.js pode memoizar fetch() feito pelo supabase-js
      // entre requisições e devolver dado desatualizado (ver D-039/D-041).
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
  });
}
