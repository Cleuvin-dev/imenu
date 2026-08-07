import type { Metadata } from "next";
import { getPlatformAdminContext } from "@/lib/auth/platform";
import { listPlansForAdmin } from "@/modules/billing/application/list-plans";
import { formatMoney } from "@/lib/money";
import { CreatePlanForm } from "@/app/(platform)/admin-geral/planos/create-plan-form";
import { updatePlanAction } from "@/app/(platform)/admin-geral/planos/actions";

export const metadata: Metadata = {
  title: "Planos — Administração geral — iMenu",
};

function limitValue(limits: unknown, key: string): number | undefined {
  if (typeof limits !== "object" || limits === null) return undefined;
  const value = (limits as Record<string, unknown>)[key];
  return typeof value === "number" ? value : undefined;
}

export default async function PlanosPage() {
  const admin = await getPlatformAdminContext();
  if (!admin) {
    return null;
  }

  const plans = await listPlansForAdmin();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold text-neutral-950">Planos</h1>
        <p className="text-sm text-neutral-600">
          Editar um plano não altera faturas já emitidas; desativar impede novas assinaturas sem afetar as existentes.
        </p>
      </div>

      <CreatePlanForm />

      {plans.length === 0 ? (
        <p className="text-sm text-neutral-600">Nenhum plano cadastrado ainda.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {plans.map((plan) => (
            <li key={plan.id} className="rounded-card border border-neutral-200 bg-white">
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
                  <span className="flex items-center gap-2">
                    <span className="font-medium text-neutral-950">{plan.name}</span>
                    <span className="text-xs text-neutral-600">({plan.code})</span>
                    <span className="text-xs text-neutral-600">{formatMoney(plan.priceCents)}/mês</span>
                    {!plan.isActive ? (
                      <span className="rounded-chip bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">Inativo</span>
                    ) : null}
                  </span>
                  <span className="text-xs font-medium text-primary-700 group-open:hidden">Editar</span>
                  <span className="hidden text-xs font-medium text-primary-700 group-open:inline">Fechar</span>
                </summary>
                <form
                  action={updatePlanAction.bind(null, plan.id)}
                  className="flex flex-col gap-3 border-t border-neutral-200 p-4"
                >
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-neutral-950">Nome</label>
                      <input name="name" required defaultValue={plan.name} maxLength={120} className="rounded-control border border-neutral-200 px-2 py-1.5 text-sm" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-neutral-950">Preço mensal (centavos)</label>
                      <input name="priceCents" type="number" min={0} required defaultValue={plan.priceCents} className="rounded-control border border-neutral-200 px-2 py-1.5 text-sm" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-neutral-950">Periodicidade (meses)</label>
                      <input
                        name="billingIntervalMonths"
                        type="number"
                        min={1}
                        max={24}
                        defaultValue={plan.billingIntervalMonths}
                        className="rounded-control border border-neutral-200 px-2 py-1.5 text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-neutral-950">Limite de produtos</label>
                      <input name="maxProducts" type="number" min={0} defaultValue={limitValue(plan.limits, "products")} className="rounded-control border border-neutral-200 px-2 py-1.5 text-sm" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-neutral-950">Limite de mesas</label>
                      <input name="maxTables" type="number" min={0} defaultValue={limitValue(plan.limits, "tables")} className="rounded-control border border-neutral-200 px-2 py-1.5 text-sm" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-neutral-950">Limite de usuários</label>
                      <input name="maxMembers" type="number" min={0} defaultValue={limitValue(plan.limits, "members")} className="rounded-control border border-neutral-200 px-2 py-1.5 text-sm" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-neutral-950">Armazenamento (MB)</label>
                      <input
                        name="maxMediaStorageMb"
                        type="number"
                        min={0}
                        defaultValue={limitValue(plan.limits, "media_storage_mb")}
                        className="rounded-control border border-neutral-200 px-2 py-1.5 text-sm"
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-neutral-700">
                    <input type="checkbox" name="isActive" defaultChecked={plan.isActive} />
                    Plano ativo
                  </label>
                  <button
                    type="submit"
                    className="w-fit rounded-control bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700"
                  >
                    Salvar
                  </button>
                </form>
              </details>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
