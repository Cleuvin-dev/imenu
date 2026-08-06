import "server-only";
import { AppError } from "@/lib/errors/app-error";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requirePlatformAdmin } from "@/lib/auth/platform";
import { updatePlanSchema, type UpdatePlanInput } from "@/modules/billing/schemas/plan.schema";

function buildLimits(data: UpdatePlanInput): Record<string, number> {
  const limits: Record<string, number> = {};
  if (data.maxProducts !== undefined) limits.products = data.maxProducts;
  if (data.maxTables !== undefined) limits.tables = data.maxTables;
  if (data.maxMembers !== undefined) limits.members = data.maxMembers;
  if (data.maxMediaStorageMb !== undefined) limits.media_storage_mb = data.maxMediaStorageMb;
  return limits;
}

/**
 * Edita ou desativa um plano (docs/03 RF-ADM-005). Nunca reescreve faturas
 * já emitidas — invoices.amount_cents é um snapshot gravado na emissão, não
 * uma referência ao preço atual do plano.
 */
export async function updatePlan(
  planId: string,
  input: unknown,
  requestId: string = crypto.randomUUID(),
): Promise<void> {
  await requirePlatformAdmin(["super_admin", "platform_admin"], requestId);

  const parsed = updatePlanSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", { requestId, fieldErrors: parsed.error.flatten().fieldErrors });
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("plans")
    .update({
      name: parsed.data.name,
      price_cents: parsed.data.priceCents,
      billing_interval_months: parsed.data.billingIntervalMonths,
      limits: buildLimits(parsed.data),
      is_active: parsed.data.isActive,
    })
    .eq("id", planId);

  if (error) {
    throw new AppError("INTERNAL_ERROR", { requestId });
  }
}
