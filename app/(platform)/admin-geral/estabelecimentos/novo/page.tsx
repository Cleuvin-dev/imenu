import type { Metadata } from "next";
import { getPlatformAdminContext } from "@/lib/auth/platform";
import { listActivePlans } from "@/modules/billing/application/list-plans";
import { CreateEstablishmentForm } from "@/app/(platform)/admin-geral/estabelecimentos/novo/create-establishment-form";

export const metadata: Metadata = {
  title: "Novo estabelecimento — Administração geral — iMenu",
};

export default async function NovoEstabelecimentoPage() {
  const admin = await getPlatformAdminContext();
  if (!admin) {
    return null;
  }

  const plans = await listActivePlans();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold text-neutral-950">Novo estabelecimento</h1>
        <p className="text-sm text-neutral-600">Cadastra o estabelecimento, a assinatura inicial e o proprietário.</p>
      </div>

      {plans.length === 0 ? (
        <p className="rounded-control bg-danger/10 px-3 py-2 text-sm text-danger">
          Nenhum plano ativo cadastrado ainda. Crie um plano antes de cadastrar um estabelecimento.
        </p>
      ) : (
        <CreateEstablishmentForm plans={plans.map((plan) => ({ id: plan.id, name: plan.name }))} />
      )}
    </div>
  );
}
