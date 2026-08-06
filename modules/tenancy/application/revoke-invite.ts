import "server-only";
import { AppError } from "@/lib/errors/app-error";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireTenantRole } from "@/lib/auth/tenant";

/** Revoga um convite pendente (docs/02 §5, regra 5). */
export async function revokeInvite(
  establishmentId: string,
  inviteId: string,
  requestId: string = crypto.randomUUID(),
): Promise<void> {
  await requireTenantRole(establishmentId, ["owner", "manager"], requestId);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("member_invites")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", inviteId)
    .eq("establishment_id", establishmentId)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .select("id");

  if (error) {
    throw new AppError("INTERNAL_ERROR", { requestId });
  }
  if (!data || data.length === 0) {
    throw new AppError("NOT_FOUND", { requestId });
  }
}
