import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPlatformAdminContext } from "@/lib/auth/platform";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/money";
import { formatDateTimePtBr } from "@/lib/dates";
import { INVOICE_STATUS_LABELS, SUBSCRIPTION_STATUS_LABELS } from "@/modules/billing/domain/labels";
import { ConfirmPaymentForm } from "@/app/(platform)/admin-geral/estabelecimentos/[id]/confirm-payment-form";

export const metadata: Metadata = {
  title: "Estabelecimento — Administração geral — iMenu",
};

export default async function EstabelecimentoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await getPlatformAdminContext();
  if (!admin) {
    return null;
  }

  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: establishment } = await supabase
    .from("establishments")
    .select("id, trade_name, legal_name, is_active")
    .eq("id", id)
    .maybeSingle();

  if (!establishment) {
    notFound();
  }

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("id, status, current_period_end, grace_until, plan:plans(name)")
    .eq("establishment_id", id)
    .maybeSingle();

  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, amount_cents, status, due_at, paid_at, reference_period_start, reference_period_end")
    .eq("establishment_id", id)
    .order("due_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold text-neutral-950">{establishment.trade_name}</h1>
        <p className="text-sm text-neutral-600">{establishment.legal_name}</p>
      </div>

      <section className="rounded-card border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-neutral-950">Assinatura</h2>
        {subscription ? (
          <dl className="mt-2 grid grid-cols-2 gap-3 text-sm text-neutral-700 sm:grid-cols-4">
            <div>
              <dt className="text-xs text-neutral-500">Plano</dt>
              <dd>{subscription.plan?.name ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-500">Status</dt>
              <dd>{SUBSCRIPTION_STATUS_LABELS[subscription.status]}</dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-500">Período atual até</dt>
              <dd>{subscription.current_period_end ? formatDateTimePtBr(subscription.current_period_end) : "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-500">Prazo adicional até</dt>
              <dd>{subscription.grace_until ? formatDateTimePtBr(subscription.grace_until) : "—"}</dd>
            </div>
          </dl>
        ) : (
          <p className="mt-2 text-sm text-neutral-600">Nenhuma assinatura cadastrada para este estabelecimento.</p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-neutral-950">Faturas</h2>
        {!invoices || invoices.length === 0 ? (
          <p className="text-sm text-neutral-600">Nenhuma fatura emitida ainda.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {invoices.map((invoice) => (
              <div key={invoice.id} className="rounded-card border border-neutral-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <div>
                    <p className="font-medium text-neutral-950">{formatMoney(invoice.amount_cents)}</p>
                    <p className="text-xs text-neutral-600">
                      Período {invoice.reference_period_start} a {invoice.reference_period_end} · vence{" "}
                      {formatDateTimePtBr(invoice.due_at)}
                      {invoice.paid_at ? ` · pago em ${formatDateTimePtBr(invoice.paid_at)}` : ""}
                    </p>
                  </div>
                  <span className="rounded-chip bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-700">
                    {INVOICE_STATUS_LABELS[invoice.status]}
                  </span>
                </div>
                {invoice.status === "open" || invoice.status === "overdue" ? (
                  <ConfirmPaymentForm establishmentId={id} invoiceId={invoice.id} amountCents={invoice.amount_cents} />
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
