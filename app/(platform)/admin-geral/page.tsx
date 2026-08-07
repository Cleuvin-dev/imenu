import type { Metadata } from "next";
import Link from "next/link";
import { getPlatformAdminContext } from "@/lib/auth/platform";
import { PLATFORM_ROLE_LABELS } from "@/modules/platform-admin/domain/platform-role-labels";
import { getPlatformDashboardSummary } from "@/modules/platform-admin/application/get-dashboard-summary";
import { SUBSCRIPTION_STATUS_LABELS, ACCESS_BLOCK_REASON_LABELS } from "@/modules/billing/domain/labels";
import { formatMoney } from "@/lib/money";
import { formatDateTimePtBr } from "@/lib/dates";

export const metadata: Metadata = {
  title: "Administração geral — iMenu",
};

const NAV_LINKS = [
  { href: "/admin-geral/estabelecimentos", label: "Estabelecimentos" },
  { href: "/admin-geral/planos", label: "Planos" },
  { href: "/admin-geral/administradores", label: "Administradores" },
  { href: "/admin-geral/auditoria", label: "Auditoria" },
];

export default async function AdminGeralPage() {
  const admin = await getPlatformAdminContext();
  if (!admin) {
    return null;
  }

  const summary = await getPlatformDashboardSummary();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold text-neutral-950">Painel geral do iMenu</h1>
        <p className="text-sm text-neutral-600">Acesso confirmado como {PLATFORM_ROLE_LABELS[admin.role]}.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        {NAV_LINKS.map((link, index) => (
          <Link
            key={link.href}
            href={link.href}
            className={
              index === 0
                ? "rounded-control bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700"
                : "rounded-control border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:border-primary-600"
            }
          >
            {link.label}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {(Object.keys(SUBSCRIPTION_STATUS_LABELS) as (keyof typeof SUBSCRIPTION_STATUS_LABELS)[]).map((status) => (
          <div key={status} className="rounded-card border border-neutral-200 bg-white p-4">
            <p className="text-2xl font-semibold text-neutral-950">{summary.establishmentsByStatus[status]}</p>
            <p className="text-xs text-neutral-600">{SUBSCRIPTION_STATUS_LABELS[status]}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-card border border-neutral-200 bg-white p-4">
          <p className="text-2xl font-semibold text-neutral-950">{summary.invoicesByStatus.open}</p>
          <p className="text-xs text-neutral-600">Faturas abertas</p>
        </div>
        <div className="rounded-card border border-neutral-200 bg-white p-4">
          <p className="text-2xl font-semibold text-neutral-950">{summary.invoicesByStatus.overdue}</p>
          <p className="text-xs text-neutral-600">Faturas vencidas</p>
        </div>
        <div className="rounded-card border border-neutral-200 bg-white p-4">
          <p className="text-2xl font-semibold text-neutral-950">{summary.invoicesByStatus.paid}</p>
          <p className="text-xs text-neutral-600">Faturas pagas</p>
        </div>
        <div className="rounded-card border border-neutral-200 bg-white p-4">
          <p className="text-2xl font-semibold text-neutral-950">{summary.dueNext7Days}</p>
          <p className="text-xs text-neutral-600">Vencimentos em 7 dias</p>
        </div>
      </div>

      <div className="rounded-card border border-neutral-200 bg-white p-4">
        <p className="text-xs text-neutral-600">Valor confirmado este mês</p>
        <p className="text-2xl font-semibold text-neutral-950">{formatMoney(summary.confirmedAmountCentsThisMonth)}</p>
      </div>

      {summary.recentSuspensions.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-neutral-950">Suspensões recentes</h2>
          <ul className="flex flex-col gap-2">
            {summary.recentSuspensions.map((item) => (
              <li
                key={item.establishmentId}
                className="flex items-center justify-between rounded-card border border-neutral-200 bg-white px-4 py-3 text-sm"
              >
                <Link href={`/admin-geral/estabelecimentos/${item.establishmentId}`} className="font-medium text-primary-700 hover:underline">
                  {item.tradeName}
                </Link>
                <span className="text-xs text-neutral-600">
                  {item.suspensionReason ? ACCESS_BLOCK_REASON_LABELS[item.suspensionReason] : "—"} ·{" "}
                  {formatDateTimePtBr(item.suspendedAt)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
