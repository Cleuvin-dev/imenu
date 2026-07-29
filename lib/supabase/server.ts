import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getPublicEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/database-types";

/**
 * Cliente Supabase para Server Components/Route Handlers/Server Actions.
 * Respeita RLS via chave anônima + sessão do usuário (cookies). Nunca usar
 * este cliente para operações que exigem bypass de RLS.
 */
export async function createSupabaseServerClient() {
  const env = getPublicEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Ignorado quando chamado a partir de um Server Component sem
          // permissão de escrita; o middleware é responsável por renovar
          // a sessão nesse caso.
        }
      },
    },
  });
}
