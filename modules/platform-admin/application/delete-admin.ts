import "server-only";
import { AppError } from "@/lib/errors/app-error";
import { requirePlatformAdmin } from "@/lib/auth/platform";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Remove definitivamente a conta de um administrador da plataforma (docs/03
 * RF-ADM-014). Diferente de estabelecimento (RF-ADM-013 exige preservar
 * dados), não há regra de retenção documentada para contas de equipe da
 * iMenu — "Desativar" (update-admin.ts) continua sendo o caminho reversível
 * para o dia a dia; isto aqui é irreversível. O guard de banco
 * (enforce_last_super_admin_guard) impede remover o único super_admin
 * ativo mesmo que a remoção venha da cascata de auth.users → profiles →
 * platform_admins, porque o gatilho é BEFORE DELETE na própria tabela.
 */
export async function deletePlatformAdmin(userId: string, requestId: string = crypto.randomUUID()): Promise<void> {
  const actor = await requirePlatformAdmin(["super_admin"], requestId);

  const admin = createSupabaseAdminClient();

  const { data: target } = await admin.from("platform_admins").select("role").eq("user_id", userId).maybeSingle();

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    throw new AppError("VALIDATION_ERROR", {
      requestId,
      message: error.message.toLowerCase().includes("super_admin")
        ? "Não é possível remover, rebaixar ou desativar o único super_admin ativo."
        : "Não foi possível remover o administrador.",
    });
  }

  const { error: auditError } = await admin.from("audit_logs").insert({
    actor_user_id: actor.userId,
    actor_scope: "platform",
    action: "platform_admin.delete",
    resource_type: "platform_admin",
    resource_id: userId,
    before_data: target ? { role: target.role } : null,
  });
  if (auditError) {
    throw new AppError("INTERNAL_ERROR", { requestId });
  }
}
