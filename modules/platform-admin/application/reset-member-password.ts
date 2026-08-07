import "server-only";
import { randomBytes } from "node:crypto";
import { AppError } from "@/lib/errors/app-error";
import { requirePlatformAdmin } from "@/lib/auth/platform";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ResetPasswordResult } from "@/modules/platform-admin/application/reset-admin-password";

/** Redefine a senha de um membro de equipe de um estabelecimento, a pedido do super admin/admin da plataforma. */
export async function resetEstablishmentMemberPassword(
  establishmentId: string,
  userId: string,
  requestId: string = crypto.randomUUID(),
): Promise<ResetPasswordResult> {
  const actor = await requirePlatformAdmin(["super_admin", "platform_admin"], requestId);

  const admin = createSupabaseAdminClient();

  const { data: member } = await admin
    .from("establishment_members")
    .select("user_id")
    .eq("establishment_id", establishmentId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!member) {
    throw new AppError("NOT_FOUND", { requestId });
  }

  const temporaryPassword = randomBytes(12).toString("base64url");
  const { error } = await admin.auth.admin.updateUserById(userId, { password: temporaryPassword });
  if (error) {
    throw new AppError("INTERNAL_ERROR", { requestId });
  }

  const { error: auditError } = await admin.from("audit_logs").insert({
    actor_user_id: actor.userId,
    actor_scope: "platform",
    establishment_id: establishmentId,
    action: "establishment_member.reset_password",
    resource_type: "establishment_member",
    resource_id: userId,
  });
  if (auditError) {
    throw new AppError("INTERNAL_ERROR", { requestId });
  }

  return { temporaryPassword };
}
