import "server-only";
import { AppError } from "@/lib/errors/app-error";
import { requirePlatformAdmin } from "@/lib/auth/platform";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { updateEstablishmentSchema } from "@/modules/platform-admin/schemas/update-establishment.schema";

/** Editar dados cadastrais e ativação (docs/03 RF-ADM-004). */
export async function updateEstablishment(
  establishmentId: string,
  input: unknown,
  requestId: string = crypto.randomUUID(),
): Promise<void> {
  await requirePlatformAdmin(["super_admin", "platform_admin"], requestId);

  const parsed = updateEstablishmentSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", { requestId, fieldErrors: parsed.error.flatten().fieldErrors });
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("establishments")
    .update({
      legal_name: parsed.data.legalName,
      trade_name: parsed.data.tradeName,
      document_number: parsed.data.documentNumber || null,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      city: parsed.data.city || null,
      state_code: parsed.data.stateCode || null,
      is_active: parsed.data.isActive,
    })
    .eq("id", establishmentId);

  if (error) {
    if (error.code === "23505") {
      throw new AppError("VALIDATION_ERROR", { requestId, message: "Já existe um estabelecimento com este documento." });
    }
    throw new AppError("INTERNAL_ERROR", { requestId });
  }
}
