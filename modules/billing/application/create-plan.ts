import "server-only";
import { AppError } from "@/lib/errors/app-error";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requirePlatformAdmin } from "@/lib/auth/platform";
import { createPlanSchema, type CreatePlanInput } from "@/modules/billing/schemas/plan.schema";

function buildLimits(data: CreatePlanInput): Record<string, number> {
  const limits: Record<string, number> = {};
  if (data.maxProducts !== undefined) limits.products = data.maxProducts;
  if (data.maxTables !== undefined) limits.tables = data.maxTables;
  if (data.maxMembers !== undefined) limits.members = data.maxMembers;
  if (data.maxMediaStorageMb !== undefined) limits.media_storage_mb = data.maxMediaStorageMb;
  return limits;
}

/** Cria plano (docs/03 RF-ADM-005, docs/04 A-04). */
export async function createPlan(input: unknown, requestId: string = crypto.randomUUID()): Promise<void> {
  await requirePlatformAdmin(["super_admin", "platform_admin"], requestId);

  const parsed = createPlanSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", { requestId, fieldErrors: parsed.error.flatten().fieldErrors });
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("plans").insert({
    code: parsed.data.code,
    name: parsed.data.name,
    price_cents: parsed.data.priceCents,
    billing_interval_months: parsed.data.billingIntervalMonths,
    limits: buildLimits(parsed.data),
    is_active: parsed.data.isActive,
  });

  if (error) {
    if (error.code === "23505") {
      throw new AppError("VALIDATION_ERROR", { requestId, message: "Já existe um plano com este código." });
    }
    throw new AppError("INTERNAL_ERROR", { requestId });
  }
}
