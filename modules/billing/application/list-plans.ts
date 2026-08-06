import "server-only";
import { AppError } from "@/lib/errors/app-error";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requirePlatformAdmin } from "@/lib/auth/platform";
import type { Database } from "@/lib/supabase/database-types";

export type PlanRow = {
  id: string;
  code: string;
  name: string;
  priceCents: number;
  billingIntervalMonths: number;
  limits: Database["public"]["Tables"]["plans"]["Row"]["limits"];
  features: Database["public"]["Tables"]["plans"]["Row"]["features"];
  isActive: boolean;
};

/** Lista planos para o admin geral (docs/03 RF-ADM-005, docs/04 A-04). Inclui inativos. */
export async function listPlansForAdmin(requestId: string = crypto.randomUUID()): Promise<PlanRow[]> {
  await requirePlatformAdmin(undefined, requestId);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("plans")
    .select("id, code, name, price_cents, billing_interval_months, limits, features, is_active")
    .order("price_cents");

  if (error) {
    throw new AppError("INTERNAL_ERROR", { requestId });
  }

  return (data ?? []).map((plan) => ({
    id: plan.id,
    code: plan.code,
    name: plan.name,
    priceCents: plan.price_cents,
    billingIntervalMonths: plan.billing_interval_months,
    limits: plan.limits,
    features: plan.features,
    isActive: plan.is_active,
  }));
}

/** Só planos ativos — usado no formulário de cadastro de estabelecimento (docs/03 RF-ADM-002). */
export async function listActivePlans(requestId: string = crypto.randomUUID()): Promise<PlanRow[]> {
  await requirePlatformAdmin(undefined, requestId);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("plans")
    .select("id, code, name, price_cents, billing_interval_months, limits, features, is_active")
    .eq("is_active", true)
    .order("price_cents");

  if (error) {
    throw new AppError("INTERNAL_ERROR", { requestId });
  }

  return (data ?? []).map((plan) => ({
    id: plan.id,
    code: plan.code,
    name: plan.name,
    priceCents: plan.price_cents,
    billingIntervalMonths: plan.billing_interval_months,
    limits: plan.limits,
    features: plan.features,
    isActive: plan.is_active,
  }));
}
