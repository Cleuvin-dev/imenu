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
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
