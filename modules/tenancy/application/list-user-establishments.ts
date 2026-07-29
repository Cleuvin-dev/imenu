import "server-only";
import { AppError } from "@/lib/errors/app-error";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { MemberRole } from "@/lib/auth/tenant";

export type UserEstablishmentSummary = {
  establishmentId: string;
  slug: string;
  tradeName: string;
  role: MemberRole;
};

/**
 * Lista os estabelecimentos em que o usuário autenticado é membro ativo,
 * usada pelo seletor de tenant após o login (docs/02, seção 7).
 */
export async function listUserEstablishments(
  requestId: string = crypto.randomUUID(),
): Promise<UserEstablishmentSummary[]> {
  const user = await requireAuthenticatedUser(requestId);
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("establishment_members")
    .select("role, establishment:establishments!inner(id, slug, trade_name, is_active)")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .eq("establishment.is_active", true);

  if (error) {
    throw new AppError("INTERNAL_ERROR", { requestId });
  }

  return data.map((row) => ({
    establishmentId: row.establishment.id,
    slug: row.establishment.slug,
    tradeName: row.establishment.trade_name,
    role: row.role,
  }));
}
