import type { Metadata } from "next";
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
    <div className="flex flex-col gap-2">
      <h1 className="text-lg font-semibold text-neutral-950">Painel de {establishment.tradeName}</h1>
      <p className="text-sm text-neutral-600">
        Acesso confirmado como {MEMBER_ROLE_LABELS[establishment.role]}. Pedidos, cardápio, mesas e equipe serão
        adicionados nas próximas fases do MVP.
      </p>
    </div>
  );
}
