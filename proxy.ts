import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getPublicEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/database-types";
import {
  GUEST_SESSION_COOKIE,
  GUEST_SESSION_MAX_AGE_SECONDS,
  generateOpaqueToken,
} from "@/modules/service-session/domain/guest-cookie";

/**
 * Renova o cookie de sessão do Supabase Auth em toda navegação. Não faz
 * autorização fina: cada página/ação protegida revalida usuário e associação
 * de tenant no servidor (references/ROTAS_E_ESTRUTURA_DE_PASTAS.md, seção 4).
 * Também garante o cookie de sessão anônima do consumidor nas rotas
 * públicas do cardápio — Server Components não podem gravar cookies durante
 * a renderização, então isso precisa acontecer aqui.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const env = getPublicEnv();
  const supabase = createServerClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  await supabase.auth.getUser();

  if (request.nextUrl.pathname.startsWith("/m/") && !request.cookies.get(GUEST_SESSION_COOKIE)) {
    response.cookies.set(GUEST_SESSION_COOKIE, generateOpaqueToken(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: GUEST_SESSION_MAX_AGE_SECONDS,
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
