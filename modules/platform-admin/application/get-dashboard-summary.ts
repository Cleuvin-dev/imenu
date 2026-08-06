import "server-only";
import { AppError } from "@/lib/errors/app-error";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requirePlatformAdmin } from "@/lib/auth/platform";
import type { Database } from "@/lib/supabase/database-types";

type SubscriptionStatus = Database["public"]["Enums"]["subscription_status"];
type InvoiceStatus = Database["public"]["Enums"]["invoice_status"];

export type PlatformDashboardSummary = {
  establishmentsByStatus: Record<SubscriptionStatus, number>;
  invoicesByStatus: Record<InvoiceStatus, number>;
  confirmedAmountCentsThisMonth: number;
  dueNext7Days: number;
  recentSuspensions: {
    establishmentId: string;
    tradeName: string;
    suspendedAt: string;
    suspensionReason: string | null;
  }[];
};

const SUBSCRIPTION_STATUSES: SubscriptionStatus[] = ["trialing", "active", "past_due", "suspended", "canceled"];
const INVOICE_STATUSES: InvoiceStatus[] = ["draft", "open", "paid", "overdue", "void"];

/** Dashboard geral do superadmin (docs/09 §12, docs/04 A-02, RF-ADM-001). */
export async function getPlatformDashboardSummary(
  requestId: string = crypto.randomUUID(),
): Promise<PlatformDashboardSummary> {
  await requirePlatformAdmin(undefined, requestId);

  const supabase = await createSupabaseServerClient();
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const [subscriptionsResult, invoicesResult, paymentsResult, suspensionsResult] = await Promise.all([
    supabase.from("subscriptions").select("status"),
    supabase.from("invoices").select("status, due_at"),
    supabase.from("payments").select("amount_cents, paid_at").eq("status", "confirmed").gte("paid_at", monthStart),
    supabase
      .from("subscriptions")
      .select("suspended_at, suspension_reason, establishment:establishments(id, trade_name)")
      .eq("status", "suspended")
      .not("suspended_at", "is", null)
      .order("suspended_at", { ascending: false })
      .limit(5),
  ]);

  if (subscriptionsResult.error || invoicesResult.error || paymentsResult.error || suspensionsResult.error) {
    throw new AppError("INTERNAL_ERROR", { requestId });
  }

  const establishmentsByStatus = Object.fromEntries(
    SUBSCRIPTION_STATUSES.map((status) => [status, 0]),
  ) as Record<SubscriptionStatus, number>;
  for (const row of subscriptionsResult.data ?? []) {
    establishmentsByStatus[row.status] += 1;
  }

  const invoicesByStatus = Object.fromEntries(INVOICE_STATUSES.map((status) => [status, 0])) as Record<
    InvoiceStatus,
    number
  >;
  let dueNext7Days = 0;
  for (const row of invoicesResult.data ?? []) {
    invoicesByStatus[row.status] += 1;
    if ((row.status === "open" || row.status === "overdue") && row.due_at >= now.toISOString() && row.due_at <= in7Days) {
      dueNext7Days += 1;
    }
  }

  const confirmedAmountCentsThisMonth = (paymentsResult.data ?? []).reduce(
    (sum, payment) => sum + payment.amount_cents,
    0,
  );

  return {
    establishmentsByStatus,
    invoicesByStatus,
    confirmedAmountCentsThisMonth,
    dueNext7Days,
    recentSuspensions: (suspensionsResult.data ?? [])
      .filter((row) => row.establishment !== null && row.suspended_at !== null)
      .map((row) => ({
        establishmentId: row.establishment!.id,
        tradeName: row.establishment!.trade_name,
        suspendedAt: row.suspended_at!,
        suspensionReason: row.suspension_reason,
      })),
  };
}
