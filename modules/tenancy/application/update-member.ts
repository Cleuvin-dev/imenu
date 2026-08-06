import "server-only";
import { AppError } from "@/lib/errors/app-error";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireTenantRole } from "@/lib/auth/tenant";
import { updateMemberSchema } from "@/modules/tenancy/schemas/update-member.schema";
import type { Database } from "@/lib/supabase/database-types";

type EstablishmentMemberUpdate = Database["public"]["Tables"]["establishment_members"]["Update"];

/**
 * Altera papel e/ou ativação de um membro (docs/03 RF-EST-012). A RLS de
 * establishment_members (Fase 1) já bloqueia manager de tocar na linha de um
 * owner, e o guard de banco impede remover/rebaixar o último owner ativo —
 * aqui só validamos entrada e mapeamos o erro para algo legível.
 */
export async function updateMember(
  establishmentId: string,
  memberId: string,
  input: unknown,
  requestId: string = crypto.randomUUID(),
): Promise<void> {
  await requireTenantRole(establishmentId, ["owner", "manager"], requestId);

  const parsed = updateMemberSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", { requestId, fieldErrors: parsed.error.flatten().fieldErrors });
  }
  if (parsed.data.role === undefined && parsed.data.isActive === undefined) {
    throw new AppError("VALIDATION_ERROR", { requestId });
  }

  const patch: EstablishmentMemberUpdate = {};
  if (parsed.data.role !== undefined) patch.role = parsed.data.role;
  if (parsed.data.isActive !== undefined) patch.is_active = parsed.data.isActive;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("establishment_members")
    .update(patch)
    .eq("id", memberId)
    .eq("establishment_id", establishmentId)
    .select("id");

  if (error) {
    if (error.code === "23514") {
      throw new AppError("VALIDATION_ERROR", {
        requestId,
        message: "Não é possível remover ou rebaixar o único proprietário ativo.",
      });
    }
    throw new AppError("INTERNAL_ERROR", { requestId });
  }
  if (!data || data.length === 0) {
    throw new AppError("NOT_FOUND", { requestId });
  }
}
