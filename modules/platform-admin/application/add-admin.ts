import "server-only";
import { AppError } from "@/lib/errors/app-error";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requirePlatformAdmin } from "@/lib/auth/platform";
import { addAdminSchema } from "@/modules/platform-admin/schemas/add-admin.schema";

/**
 * Concede papel de administrador da plataforma a um usuário que já tem
 * conta (docs/03 RF-ADM-014). Não cria contas novas — o candidato precisa
 * já ter feito login pelo menos uma vez (ou ter sido cadastrado como owner
 * de algum estabelecimento) para existir em profiles.
 */
export async function addPlatformAdmin(input: unknown, requestId: string = crypto.randomUUID()): Promise<void> {
  const actor = await requirePlatformAdmin(["super_admin"], requestId);

  const parsed = addAdminSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", { requestId, fieldErrors: parsed.error.flatten().fieldErrors });
  }

  const supabase = await createSupabaseServerClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", parsed.data.email)
    .maybeSingle();

  if (profileError) {
    throw new AppError("INTERNAL_ERROR", { requestId });
  }
  if (!profile) {
    throw new AppError("NOT_FOUND", {
      requestId,
      message: "Nenhuma conta encontrada com este e-mail. A pessoa precisa ter uma conta iMenu antes.",
    });
  }

  const { error } = await supabase
    .from("platform_admins")
    .upsert(
      { user_id: profile.id, role: parsed.data.role, is_active: true, created_by: actor.userId },
      { onConflict: "user_id" },
    );

  if (error) {
    throw new AppError("INTERNAL_ERROR", { requestId });
  }
}
