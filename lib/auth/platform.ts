import "server-only";
import { AppError } from "@/lib/errors/app-error";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database-types";

export type PlatformRole = Database["public"]["Enums"]["platform_role"];

export type PlatformAdminContext = {
  userId: string;
  role: PlatformRole;
};

/**
 * Confirma no banco que o usuário autenticado tem registro ativo em
 * platform_admins. Usuários de estabelecimento nunca recebem acesso
 * automático a rotas de plataforma (docs/02, regra 8).
 */
export async function requirePlatformAdmin(
  allowedRoles?: readonly PlatformRole[],
  requestId: string = crypto.randomUUID(),
): Promise<PlatformAdminContext> {
  const user = await requireAuthenticatedUser(requestId);
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("platform_admins")
    .select("role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) {
    throw new AppError("FORBIDDEN", { requestId });
  }

  if (allowedRoles && !allowedRoles.includes(data.role)) {
    throw new AppError("FORBIDDEN", { requestId });
  }

  return { userId: user.id, role: data.role };
}

export async function getPlatformAdminContext(
  requestId: string = crypto.randomUUID(),
): Promise<PlatformAdminContext | null> {
  try {
    return await requirePlatformAdmin(undefined, requestId);
  } catch {
    return null;
  }
}
