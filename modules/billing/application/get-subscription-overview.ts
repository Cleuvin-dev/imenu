import "server-only";
import { AppError } from "@/lib/errors/app-error";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireTenantRole } from "@/lib/auth/tenant";
import type { Database } from "@/lib/supabase/database-types";

type SubscriptionStatus = Database["public"]["Enums"]["subscription_status"];
type InvoiceStatus = Database["public"]["Enums"]["invoice_status"];

export type SubscriptionOverview = {
  subscription: {
    status: SubscriptionStatus;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    trialEndsAt: string | null;
    graceUntil: string | null;
    suspensionReason: string | null;
    suspensionNote: string | null;
    plan: { name: string; priceCents: number; billingIntervalMonths: number } | null;
  } | null;
  invoices: {
    id: string;
    amountCents: number;
    status: InvoiceStatus;
    dueAt: string;
    paidAt: string | null;
    referencePeriodStart: string;
    referencePeriodEnd: string;
  }[];
};

/** Tela de assinatura do estabelecimento (docs/03 RF-EST-013, docs/04 E-09). Somente leitura. */
export async function getSubscriptionOverview(
  establishmentId: string,
  requestId: string = crypto.randomUUID(),
): Promise<SubscriptionOverview> {
  await requireTenantRole(establishmentId, ["owner", "manager"], requestId);

  const supabase = await createSupabaseServerClient();

  const [subscriptionResult, invoicesResult] = await Promise.all([
    supabase
      .from("subscriptions")
      .select(
        "status, current_period_start, current_period_end, trial_ends_at, grace_until, suspension_reason, suspension_note, plan:plans(name, price_cents, billing_interval_months)",
      )
      .eq("establishment_id", establishmentId)
      .maybeSingle(),
    supabase
      .from("invoices")
      .select("id, amount_cents, status, due_at, paid_at, reference_period_start, reference_period_end")
      .eq("establishment_id", establishmentId)
      .order("due_at", { ascending: false })
      .limit(25),
  ]);

  if (subscriptionResult.error || invoicesResult.error) {
    throw new AppError("INTERNAL_ERROR", { requestId });
  }

  const subscription = subscriptionResult.data;

  return {
    subscription: subscription
      ? {
          status: subscription.status,
          currentPeriodStart: subscription.current_period_start,
          currentPeriodEnd: subscription.current_period_end,
          trialEndsAt: subscription.trial_ends_at,
          graceUntil: subscription.grace_until,
          suspensionReason: subscription.suspension_reason,
          suspensionNote: subscription.suspension_note,
          plan: subscription.plan
            ? {
                name: subscription.plan.name,
                priceCents: subscription.plan.price_cents,
                billingIntervalMonths: subscription.plan.billing_interval_months,
              }
            : null,
        }
      : null,
    invoices: (invoicesResult.data ?? []).map((invoice) => ({
      id: invoice.id,
      amountCents: invoice.amount_cents,
      status: invoice.status,
      dueAt: invoice.due_at,
      paidAt: invoice.paid_at,
      referencePeriodStart: invoice.reference_period_start,
      referencePeriodEnd: invoice.reference_period_end,
    })),
  };
}
