import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPlatformAdminContext } from "@/lib/auth/platform";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/money";
import { formatDateTimePtBr } from "@/lib/dates";
import { INVOICE_STATUS_LABELS, SUBSCRIPTION_STATUS_LABELS } from "@/modules/billing/domain/labels";
import { ConfirmPaymentForm } from "@/app/(platform)/admin-geral/estabelecimentos/[id]/confirm-payment-form";
import { CreateInvoiceForm } from "@/app/(platform)/admin-geral/estabelecimentos/[id]/create-invoice-form";
import { EditEstablishmentForm } from "@/app/(platform)/admin-geral/estabelecimentos/[id]/edit-establishment-form";
import { SuspensionControl } from "@/app/(platform)/admin-geral/estabelecimentos/[id]/suspension-control";
import { MemberResetPasswordButton } from "@/app/(platform)/admin-geral/estabelecimentos/[id]/member-reset-password-button";
import { MEMBER_ROLE_LABELS } from "@/modules/tenancy/domain/member-role-labels";
import type { Database } from "@/lib/supabase/database-types";

type TeamMember = {
  id: string;
  userId: string;
  displayName: string;
  email: string;
  role: Database["public"]["Enums"]["member_role"];
  isActive: boolean;
};

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
    .select(
      "id, trade_name, legal_name, document_number, email, phone, city, state_code, is_active, manual_suspended_at, manual_suspension_reason",
    )
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

  const { data: teamData } = await supabase.rpc("list_establishment_team", { p_establishment_id: id });
  const team = (teamData as unknown as TeamMember[] | null) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-neutral-950">{establishment.trade_name}</h1>
          <p className="text-sm text-neutral-600">{establishment.legal_name}</p>
        </div>
        <Link
          href={`/admin-geral/auditoria?establishmentId=${id}`}
          className="text-sm font-medium text-primary-700 hover:underline"
        >
          Ver auditoria deste estabelecimento
        </Link>
      </div>

      <section className="rounded-card border border-neutral-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-neutral-950">Suspensão manual</h2>
        <p className="mb-3 text-xs text-neutral-600">
          Bloqueia o acesso ao painel e ao cardápio público sem apagar nenhum dado (produtos, pedidos, faturas e
          histórico continuam intactos). Reversível a qualquer momento.
        </p>
        <SuspensionControl
          establishmentId={id}
          manualSuspendedAt={establishment.manual_suspended_at}
          manualSuspensionReason={establishment.manual_suspension_reason}
        />
      </section>

      <section className="rounded-card border border-neutral-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-neutral-950">Cadastro</h2>
        <EditEstablishmentForm
          establishmentId={id}
          establishment={{
            legalName: establishment.legal_name,
            tradeName: establishment.trade_name,
            documentNumber: establishment.document_number,
            email: establishment.email,
            phone: establishment.phone,
            city: establishment.city,
            stateCode: establishment.state_code,
            isActive: establishment.is_active,
          }}
        />
      </section>

      <section className="rounded-card border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-neutral-950">Assinatura</h2>
        {subscription ? (
          <dl className="mt-2 grid grid-cols-2 gap-3 text-sm text-neutral-700 sm:grid-cols-4">
            <div>
              <dt className="text-xs text-neutral-600">Plano</dt>
              <dd>{subscription.plan?.name ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-600">Status</dt>
              <dd>{SUBSCRIPTION_STATUS_LABELS[subscription.status]}</dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-600">Período atual até</dt>
              <dd>{subscription.current_period_end ? formatDateTimePtBr(subscription.current_period_end) : "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-600">Prazo adicional até</dt>
              <dd>{subscription.grace_until ? formatDateTimePtBr(subscription.grace_until) : "—"}</dd>
            </div>
          </dl>
        ) : (
          <p className="mt-2 text-sm text-neutral-600">Nenhuma assinatura cadastrada para este estabelecimento.</p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-neutral-950">Faturas</h2>
        <CreateInvoiceForm establishmentId={id} />
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

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-neutral-950">Equipe</h2>
        {team.length === 0 ? (
          <p className="text-sm text-neutral-600">Nenhum membro cadastrado ainda.</p>
        ) : (
          <div className="overflow-x-auto rounded-card border border-neutral-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-xs font-medium uppercase tracking-wide text-neutral-600">
                <tr>
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">E-mail</th>
                  <th className="px-4 py-3">Papel</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {team.map((member) => (
                  <tr key={member.id} className="border-b border-neutral-200 last:border-0">
                    <td className="px-4 py-3 text-neutral-950">{member.displayName}</td>
                    <td className="px-4 py-3 text-neutral-700">{member.email}</td>
                    <td className="px-4 py-3 text-neutral-700">{MEMBER_ROLE_LABELS[member.role]}</td>
                    <td className="px-4 py-3 text-neutral-700">{member.isActive ? "Ativo" : "Desativado"}</td>
                    <td className="px-4 py-3">
                      <MemberResetPasswordButton establishmentId={id} userId={member.userId} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
