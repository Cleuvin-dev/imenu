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
  // cookies() PRIMEIRO: é o que sinaliza ao Next.js para desviar de uma
  // tentativa de pré-renderização estática em build para renderização
  // dinâmica de verdade. Se getPublicEnv() rodasse antes e uma variável de
  // ambiente faltasse nesse momento do build, o erro do Zod interromperia
  // o build inteiro antes do Next sequer perceber que a rota é dinâmica.
  const cookieStore = await cookies();
  const env = getPublicEnv();

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
    global: {
      // O Data Cache do Next.js intercepta fetch() em qualquer lugar do
      // código do servidor, inclusive dentro do supabase-js — e pode
      // memoizar uma leitura entre requisições mesmo em rotas dinâmicas
      // (Data Cache é uma camada separada do Full Route Cache). Sem isso,
      // qualquer leitura via este cliente pode devolver dado desatualizado
      // logo após uma escrita (ver status/DECISION_LOG.md, D-039/D-041).
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
  });
}
