"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getPublicEnv } from "@/lib/env/public";
import type { Database } from "@/lib/supabase/database-types";

/**
 * Cliente Supabase para uso em componentes de cliente. Usa apenas a chave
 * anônima pública; nunca inicializar aqui um cliente com service role.
 */
export function createSupabaseBrowserClient() {
  const env = getPublicEnv();
  return createBrowserClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
