import type { Metadata } from "next";
import Link from "next/link";
import { getPlatformAdminContext } from "@/lib/auth/platform";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SUBSCRIPTION_STATUS_LABELS } from "@/modules/billing/domain/labels";
import { formatDateTimePtBr } from "@/lib/dates";

export const metadata: Metadata = {
  title: "Estabelecimentos — Administração geral — iMenu",
};

type EstablishmentRow = {
  id: string;
  trade_name: string;
  slug: string;
  is_active: boolean;
  subscriptions: {
    status: string;
    current_period_end: string | null;
    plans: { name: string } | null;
  } | null;
};

export default async function EstabelecimentosPage() {
  const admin = await getPlatformAdminContext();
  if (!admin) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("establishments")
    .select("id, trade_name, slug, is_active, subscriptions(status, current_period_end, plans(name))")
    .order("trade_name");

  const establishments = (error ? [] : (data as unknown as EstablishmentRow[])) ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold text-neutral-950">Estabelecimentos</h1>
        <p className="text-sm text-neutral-600">Plano, situação da assinatura e próximo vencimento.</p>
      </div>

      {error ? (
        <p role="alert" className="rounded-control bg-danger/10 px-3 py-2 text-sm text-danger">
          Não foi possível carregar os estabelecimentos.
        </p>
      ) : null}

      {!error && establishments.length === 0 ? (
        <p className="text-sm text-neutral-600">Nenhum estabelecimento cadastrado ainda.</p>
      ) : null}

      {establishments.length > 0 ? (
        <div className="overflow-x-auto rounded-card border border-neutral-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-xs font-medium uppercase tracking-wide text-neutral-600">
              <tr>
                <th className="px-4 py-3">Estabelecimento</th>
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
                      {establishment.trade_name}
                    </Link>
                    {!establishment.is_active ? (
                      <span className="ml-2 rounded-chip bg-neutral-200 px-2 py-0.5 text-xs text-neutral-600">
                        Inativo
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-neutral-700">
                    {establishment.subscriptions?.plans?.name ?? "Sem plano"}
                  </td>
                  <td className="px-4 py-3 text-neutral-700">
                    {establishment.subscriptions
                      ? (SUBSCRIPTION_STATUS_LABELS[
                          establishment.subscriptions.status as keyof typeof SUBSCRIPTION_STATUS_LABELS
                        ] ?? establishment.subscriptions.status)
                      : "Sem assinatura"}
                  </td>
                  <td className="px-4 py-3 text-neutral-700">
                    {establishment.subscriptions?.current_period_end
                      ? formatDateTimePtBr(establishment.subscriptions.current_period_end)
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
