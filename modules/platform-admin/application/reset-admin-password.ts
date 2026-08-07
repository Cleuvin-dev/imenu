import "server-only";
import { randomBytes } from "node:crypto";
import { AppError } from "@/lib/errors/app-error";
import { requirePlatformAdmin } from "@/lib/auth/platform";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type ResetPasswordResult = {
  temporaryPassword: string;
};

/** Redefine a senha de um administrador da plataforma (docs/03 RF-ADM-014). Só super_admin. */
export async function resetPlatformAdminPassword(
  userId: string,
  requestId: string = crypto.randomUUID(),
): Promise<ResetPasswordResult> {
  const actor = await requirePlatformAdmin(["super_admin"], requestId);

  const admin = createSupabaseAdminClient();
  const temporaryPassword = randomBytes(12).toString("base64url");

  const { error } = await admin.auth.admin.updateUserById(userId, { password: temporaryPassword });
  if (error) {
    throw new AppError("INTERNAL_ERROR", { requestId });
  }

  const { error: auditError } = await admin.from("audit_logs").insert({
    actor_user_id: actor.userId,
    actor_scope: "platform",
    action: "platform_admin.reset_password",
    resource_type: "platform_admin",
    resource_id: userId,
  });
  if (auditError) {
    throw new AppError("INTERNAL_ERROR", { requestId });
  }

  return { temporaryPassword };
}
