import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/money";
import { formatDateTimePtBr } from "@/lib/dates";
import { INVOICE_STATUS_LABELS, SUBSCRIPTION_STATUS_LABELS } from "@/modules/billing/domain/labels";

/**
 * Versão mínima da tela de assinatura exigida pela Fase 2 para o owner
 * durante bloqueio (docs/09 §10). A página completa de assinatura, com
 * histórico e edição, é entregue na Fase 8.
 */
export async function OwnerBillingSummary({ establishmentId }: { establishmentId: string }) {
  const supabase = await createSupabaseServerClient();

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("status, current_period_end, grace_until, plan:plans(name)")
    .eq("establishment_id", establishmentId)
    .maybeSingle();

  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, amount_cents, status, due_at")
    .eq("establishment_id", establishmentId)
    .in("status", ["open", "overdue"])
    .order("due_at", { ascending: true });

  return (
    <div className="flex w-full max-w-lg flex-col gap-4">
      <div className="rounded-card border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-neutral-950">Assinatura</h2>
        {subscription ? (
          <dl className="mt-2 grid grid-cols-2 gap-3 text-sm text-neutral-700">
            <div>
              <dt className="text-xs text-neutral-600">Plano</dt>
              <dd>{subscription.plan?.name ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-600">Status</dt>
              <dd>{SUBSCRIPTION_STATUS_LABELS[subscription.status]}</dd>
            </div>
          </dl>
        ) : (
          <p className="mt-2 text-sm text-neutral-600">Nenhuma assinatura cadastrada.</p>
        )}
      </div>

      {invoices && invoices.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-neutral-950">Faturas pendentes</h2>
          {invoices.map((invoice) => (
            <div
              key={invoice.id}
              className="flex items-center justify-between rounded-card border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-700"
            >
              <span>
                {formatMoney(invoice.amount_cents)} · vence {formatDateTimePtBr(invoice.due_at)}
              </span>
              <span className="rounded-chip bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-700">
                {INVOICE_STATUS_LABELS[invoice.status]}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      <p className="text-sm text-neutral-600">
        Para regularizar, entre em contato com o suporte do iMenu informando o nome do estabelecimento.
      </p>
    </div>
  );
}
