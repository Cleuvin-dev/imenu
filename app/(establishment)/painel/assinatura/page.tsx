import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { resolveActiveEstablishment } from "@/modules/tenancy/application/resolve-active-establishment";
import { getSubscriptionOverview } from "@/modules/billing/application/get-subscription-overview";
import { SUBSCRIPTION_STATUS_LABELS, INVOICE_STATUS_LABELS } from "@/modules/billing/domain/labels";
import { formatMoney } from "@/lib/money";
import { formatDateTimePtBr } from "@/lib/dates";

export const metadata: Metadata = {
  title: "Assinatura — iMenu",
};

export default async function AssinaturaPage() {
  const resolution = await resolveActiveEstablishment();
  if (resolution.status !== "active") {
    redirect("/painel");
  }

  const { establishmentId, role } = resolution.establishment;

  if (role !== "owner" && role !== "manager") {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center">
        <h1 className="text-lg font-semibold text-neutral-950">Acesso restrito</h1>
        <p className="max-w-sm text-sm text-neutral-600">
          Seu papel não tem acesso à assinatura. Fale com o proprietário do estabelecimento.
        </p>
      </div>
    );
  }

  const { subscription, invoices } = await getSubscriptionOverview(establishmentId);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold text-neutral-950">Assinatura</h1>
        <p className="text-sm text-neutral-600">Plano, período, prazos e faturas do estabelecimento.</p>
      </div>

      {subscription ? (
        <div className="rounded-card border border-neutral-200 bg-white p-4">
          <dl className="grid grid-cols-2 gap-4 text-sm text-neutral-700 sm:grid-cols-3">
            <div>
              <dt className="text-xs text-neutral-500">Plano</dt>
              <dd className="font-medium text-neutral-950">{subscription.plan?.name ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-500">Status</dt>
              <dd className="font-medium text-neutral-950">{SUBSCRIPTION_STATUS_LABELS[subscription.status]}</dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-500">Valor mensal</dt>
              <dd className="font-medium text-neutral-950">
                {subscription.plan ? formatMoney(subscription.plan.priceCents) : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-500">Período atual</dt>
              <dd className="font-medium text-neutral-950">
                {subscription.currentPeriodStart ? formatDateTimePtBr(subscription.currentPeriodStart) : "—"} até{" "}
                {subscription.currentPeriodEnd ? formatDateTimePtBr(subscription.currentPeriodEnd) : "—"}
              </dd>
            </div>
            {subscription.trialEndsAt ? (
              <div>
                <dt className="text-xs text-neutral-500">Teste até</dt>
                <dd className="font-medium text-neutral-950">{formatDateTimePtBr(subscription.trialEndsAt)}</dd>
              </div>
            ) : null}
            {subscription.graceUntil ? (
              <div>
                <dt className="text-xs text-neutral-500">Prazo adicional até</dt>
                <dd className="font-medium text-neutral-950">{formatDateTimePtBr(subscription.graceUntil)}</dd>
              </div>
            ) : null}
          </dl>
          {subscription.suspensionReason ? (
            <p className="mt-3 rounded-control bg-danger/10 px-3 py-2 text-sm text-danger">
              Suspensa: {subscription.suspensionNote ?? subscription.suspensionReason}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-neutral-600">Nenhuma assinatura cadastrada para este estabelecimento.</p>
      )}

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-neutral-950">Faturas</h2>
        {invoices.length === 0 ? (
          <p className="text-sm text-neutral-600">Nenhuma fatura emitida ainda.</p>
        ) : (
          <div className="overflow-x-auto rounded-card border border-neutral-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-neutral-200 text-xs text-neutral-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Período</th>
                  <th className="px-4 py-2 font-medium">Valor</th>
                  <th className="px-4 py-2 font-medium">Vencimento</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-neutral-100 last:border-0">
                    <td className="px-4 py-2 text-neutral-700">
                      {invoice.referencePeriodStart} – {invoice.referencePeriodEnd}
                    </td>
                    <td className="px-4 py-2 text-neutral-700">{formatMoney(invoice.amountCents)}</td>
                    <td className="px-4 py-2 text-neutral-700">{formatDateTimePtBr(invoice.dueAt)}</td>
                    <td className="px-4 py-2">
                      <span className="rounded-chip bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-700">
                        {INVOICE_STATUS_LABELS[invoice.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-neutral-500">
        Para alterar plano, confirmar pagamento ou negociar prazos, fale com o suporte do iMenu.
      </p>
    </div>
  );
}
