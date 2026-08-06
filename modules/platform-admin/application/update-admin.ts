import "server-only";
import { AppError } from "@/lib/errors/app-error";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requirePlatformAdmin } from "@/lib/auth/platform";
import { updateAdminSchema } from "@/modules/platform-admin/schemas/add-admin.schema";
import type { Database } from "@/lib/supabase/database-types";

type PlatformAdminUpdate = Database["public"]["Tables"]["platform_admins"]["Update"];

/**
 * Altera papel/ativação de um administrador (docs/03 RF-ADM-014). O guard de
 * banco (enforce_last_super_admin_guard) impede remover/rebaixar o único
 * super_admin ativo — aqui só validamos entrada e traduzimos o erro.
 */
export async function updatePlatformAdmin(
  userId: string,
  input: unknown,
  requestId: string = crypto.randomUUID(),
): Promise<void> {
  await requirePlatformAdmin(["super_admin"], requestId);

  const parsed = updateAdminSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", { requestId, fieldErrors: parsed.error.flatten().fieldErrors });
  }
  if (parsed.data.role === undefined && parsed.data.isActive === undefined) {
    throw new AppError("VALIDATION_ERROR", { requestId });
  }

  const patch: PlatformAdminUpdate = {};
  if (parsed.data.role !== undefined) patch.role = parsed.data.role;
  if (parsed.data.isActive !== undefined) patch.is_active = parsed.data.isActive;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("platform_admins").update(patch).eq("user_id", userId).select("user_id");

  if (error) {
    if (error.code === "23514") {
      throw new AppError("VALIDATION_ERROR", {
        requestId,
        message: "Não é possível remover, rebaixar ou desativar o único super_admin ativo.",
      });
    }
    throw new AppError("INTERNAL_ERROR", { requestId });
  }
  if (!data || data.length === 0) {
    throw new AppError("NOT_FOUND", { requestId });
  }
}
