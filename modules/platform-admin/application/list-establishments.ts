import "server-only";
import { AppError } from "@/lib/errors/app-error";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requirePlatformAdmin } from "@/lib/auth/platform";
import { establishmentFiltersSchema } from "@/modules/platform-admin/schemas/update-establishment.schema";
import type { Database } from "@/lib/supabase/database-types";

type SubscriptionStatus = Database["public"]["Enums"]["subscription_status"];

export type EstablishmentListItem = {
  id: string;
  tradeName: string;
  city: string | null;
  ownerContactName: string | null;
  isActive: boolean;
  planName: string | null;
  subscriptionStatus: SubscriptionStatus | null;
  currentPeriodEnd: string | null;
};

/** Busca/filtros do painel geral (docs/03 RF-ADM-003, docs/04 A-03). */
export async function listEstablishmentsForAdmin(
  rawFilters: unknown,
  requestId: string = crypto.randomUUID(),
): Promise<EstablishmentListItem[]> {
  await requirePlatformAdmin(undefined, requestId);

  const filters = establishmentFiltersSchema.parse(rawFilters);
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("establishments")
    .select(
      "id, trade_name, city, owner_contact_name, is_active, subscriptions(status, current_period_end, plan_id, plans(name))",
    )
    .order("trade_name");

  if (filters.q) {
    const term = filters.q.replace(/[%,]/g, " ").trim();
    query = query.or(
      `trade_name.ilike.%${term}%,legal_name.ilike.%${term}%,document_number.ilike.%${term}%,city.ilike.%${term}%,owner_contact_name.ilike.%${term}%`,
    );
  }

  const { data, error } = await query;
  if (error) {
    throw new AppError("INTERNAL_ERROR", { requestId });
  }

  const rows = (data ?? []) as unknown as {
    id: string;
    trade_name: string;
    city: string | null;
    owner_contact_name: string | null;
    is_active: boolean;
    subscriptions: { status: SubscriptionStatus; current_period_end: string | null; plan_id: string; plans: { name: string } | null } | null;
  }[];

  return rows
    .filter((row) => (filters.status ? row.subscriptions?.status === filters.status : true))
    .filter((row) => (filters.planId ? row.subscriptions?.plan_id === filters.planId : true))
    .map((row) => ({
      id: row.id,
      tradeName: row.trade_name,
      city: row.city,
      ownerContactName: row.owner_contact_name,
      isActive: row.is_active,
      planName: row.subscriptions?.plans?.name ?? null,
      subscriptionStatus: row.subscriptions?.status ?? null,
      currentPeriodEnd: row.subscriptions?.current_period_end ?? null,
    }));
}
