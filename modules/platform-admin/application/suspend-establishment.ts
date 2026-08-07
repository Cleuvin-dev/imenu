import "server-only";
import { AppError } from "@/lib/errors/app-error";
import { requirePlatformAdmin } from "@/lib/auth/platform";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { suspendEstablishmentSchema } from "@/modules/platform-admin/schemas/suspend-establishment.schema";

/**
 * Suspende manualmente um estabelecimento com motivo (docs/03 RF-ADM-010),
 * preservando todos os dados (RF-ADM-013) — bloqueia painel e cardápio
 * público via evaluate_establishment_access/get_public_menu, sem apagar
 * nada. Reversível a qualquer momento via reactivateEstablishment.
 */
export async function suspendEstablishment(
  establishmentId: string,
  input: unknown,
  requestId: string = crypto.randomUUID(),
): Promise<void> {
  await requirePlatformAdmin(["super_admin", "platform_admin"], requestId);

  const parsed = suspendEstablishmentSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", { requestId, fieldErrors: parsed.error.flatten().fieldErrors });
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("platform_suspend_establishment", {
    p_establishment_id: establishmentId,
    p_reason: parsed.data.reason,
  });

  if (error) {
    throw new AppError("INTERNAL_ERROR", { requestId });
  }
}

export async function reactivateEstablishment(
  establishmentId: string,
  requestId: string = crypto.randomUUID(),
): Promise<void> {
  await requirePlatformAdmin(["super_admin", "platform_admin"], requestId);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("platform_reactivate_establishment", {
    p_establishment_id: establishmentId,
  });

  if (error) {
    throw new AppError("INTERNAL_ERROR", { requestId });
  }
}
