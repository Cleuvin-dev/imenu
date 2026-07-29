import "server-only";
import { AppError } from "@/lib/errors/app-error";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database-types";

export type MemberRole = Database["public"]["Enums"]["member_role"];

/** Nome do cookie que guarda o estabelecimento selecionado na sessão do painel. */
export const ACTIVE_ESTABLISHMENT_COOKIE = "imenu_active_establishment";

export type ActiveEstablishmentMembership = {
  userId: string;
  establishmentId: string;
  role: MemberRole;
};

/**
 * Confirma no banco — via RLS, nunca por confiança na URL/cookie — que o
 * usuário autenticado é membro ativo do estabelecimento informado.
 */
export async function requireTenantMembership(
  establishmentId: string,
  requestId: string = crypto.randomUUID(),
): Promise<ActiveEstablishmentMembership> {
  const user = await requireAuthenticatedUser(requestId);
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("establishment_members")
    .select("role")
    .eq("establishment_id", establishmentId)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) {
    throw new AppError("FORBIDDEN", { requestId });
  }

  return { userId: user.id, establishmentId, role: data.role };
}

export async function requireTenantRole(
  establishmentId: string,
  allowedRoles: readonly MemberRole[],
  requestId: string = crypto.randomUUID(),
): Promise<ActiveEstablishmentMembership> {
  const membership = await requireTenantMembership(establishmentId, requestId);
  if (!allowedRoles.includes(membership.role)) {
    throw new AppError("FORBIDDEN", { requestId });
  }
  return membership;
}
