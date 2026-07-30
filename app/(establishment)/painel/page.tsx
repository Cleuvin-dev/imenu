import type { Metadata } from "next";
import Link from "next/link";
import { resolveActiveEstablishment } from "@/modules/tenancy/application/resolve-active-establishment";
import { MEMBER_ROLE_LABELS } from "@/modules/tenancy/domain/member-role-labels";

export const metadata: Metadata = {
  title: "Painel — iMenu",
};

export default async function PainelPage() {
  const resolution = await resolveActiveEstablishment();

  if (resolution.status !== "active") {
    return null;
  }

  const { establishment } = resolution;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold text-neutral-950">Painel de {establishment.tradeName}</h1>
        <p className="text-sm text-neutral-600">
          Acesso confirmado como {MEMBER_ROLE_LABELS[establishment.role]}. Pedidos, mesas e equipe serão adicionados
          nas próximas fases do MVP.
        </p>
      </div>
      <div className="flex gap-3">
        <Link
          href="/painel/cardapio/produtos"
          className="rounded-control bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700"
        >
          Cardápio: produtos
        </Link>
        <Link
          href="/painel/cardapio/categorias"
          className="rounded-control border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:border-primary-600"
        >
          Cardápio: categorias
        </Link>
      </div>
    </div>
  );
}
