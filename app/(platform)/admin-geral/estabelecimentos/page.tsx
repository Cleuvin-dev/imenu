import type { Metadata } from "next";
import Link from "next/link";
import { getPlatformAdminContext } from "@/lib/auth/platform";
import { listEstablishmentsForAdmin } from "@/modules/platform-admin/application/list-establishments";
import { listPlansForAdmin } from "@/modules/billing/application/list-plans";
import { SUBSCRIPTION_STATUS_LABELS } from "@/modules/billing/domain/labels";
import { formatDateTimePtBr } from "@/lib/dates";

export const metadata: Metadata = {
  title: "Estabelecimentos — Administração geral — iMenu",
};

export default async function EstabelecimentosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; planId?: string }>;
}) {
  const admin = await getPlatformAdminContext();
  if (!admin) {
    return null;
  }

  const filters = await searchParams;
  const [establishments, plans] = await Promise.all([
    listEstablishmentsForAdmin(filters),
    listPlansForAdmin(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-neutral-950">Estabelecimentos</h1>
          <p className="text-sm text-neutral-600">Plano, situação da assinatura e próximo vencimento.</p>
        </div>
        <Link
          href="/admin-geral/estabelecimentos/novo"
          className="rounded-control bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700"
        >
          Novo estabelecimento
        </Link>
      </div>

      <form className="flex flex-wrap items-end gap-3 rounded-card border border-neutral-200 bg-white p-4">
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="q" className="text-xs font-medium text-neutral-950">
            Nome, documento, cidade ou responsável
          </label>
          <input
            id="q"
            name="q"
            type="text"
            defaultValue={filters.q}
            className="rounded-control border border-neutral-200 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="status" className="text-xs font-medium text-neutral-950">
            Status da assinatura
          </label>
          <select
            id="status"
            name="status"
            defaultValue={filters.status ?? ""}
            className="rounded-control border border-neutral-200 px-3 py-2 text-sm"
          >
            <option value="">Todos</option>
            {Object.entries(SUBSCRIPTION_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="planId" className="text-xs font-medium text-neutral-950">
            Plano
          </label>
          <select
            id="planId"
            name="planId"
            defaultValue={filters.planId ?? ""}
            className="rounded-control border border-neutral-200 px-3 py-2 text-sm"
          >
            <option value="">Todos</option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="rounded-control border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:border-primary-600"
        >
          Filtrar
        </button>
      </form>

      {establishments.length === 0 ? (
        <p className="text-sm text-neutral-600">Nenhum estabelecimento encontrado com esses filtros.</p>
      ) : (
        <div className="overflow-x-auto rounded-card border border-neutral-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-xs font-medium uppercase tracking-wide text-neutral-600">
              <tr>
                <th className="px-4 py-3">Estabelecimento</th>
                <th className="px-4 py-3">Cidade</th>
                <th className="px-4 py-3">Responsável</th>
                <th className="px-4 py-3">Plano</th>
                <th className="px-4 py-3">Assinatura</th>
                <th className="px-4 py-3">Período atual até</th>
              </tr>
            </thead>
            <tbody>
              {establishments.map((establishment) => (
                <tr key={establishment.id} className="border-b border-neutral-200 last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin-geral/estabelecimentos/${establishment.id}`}
                      className="font-medium text-primary-700 hover:underline"
                    >
                      {establishment.tradeName}
                    </Link>
                    {!establishment.isActive ? (
                      <span className="ml-2 rounded-chip bg-neutral-200 px-2 py-0.5 text-xs text-neutral-600">
                        Inativo
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-neutral-700">{establishment.city ?? "—"}</td>
                  <td className="px-4 py-3 text-neutral-700">{establishment.ownerContactName ?? "—"}</td>
                  <td className="px-4 py-3 text-neutral-700">{establishment.planName ?? "Sem plano"}</td>
                  <td className="px-4 py-3 text-neutral-700">
                    {establishment.subscriptionStatus
                      ? SUBSCRIPTION_STATUS_LABELS[establishment.subscriptionStatus]
                      : "Sem assinatura"}
                  </td>
                  <td className="px-4 py-3 text-neutral-700">
                    {establishment.currentPeriodEnd ? formatDateTimePtBr(establishment.currentPeriodEnd) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
