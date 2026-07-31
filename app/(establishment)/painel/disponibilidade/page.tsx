import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { resolveActiveEstablishment } from "@/modules/tenancy/application/resolve-active-establishment";
import { getAvailabilityBoardAction } from "@/app/(establishment)/painel/disponibilidade/actions";
import { AvailabilityBoard } from "@/app/(establishment)/painel/disponibilidade/availability-board";

export const metadata: Metadata = {
  title: "Disponibilidade — iMenu",
};

export default async function DisponibilidadePage() {
  const resolution = await resolveActiveEstablishment();
  if (resolution.status !== "active") {
    redirect("/painel");
  }

  const { establishmentId, role } = resolution.establishment;
  const products = await getAvailabilityBoardAction();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold text-neutral-950">Disponibilidade rápida</h1>
        <p className="text-sm text-neutral-600">
          Marque um produto como esgotado ou disponível sem abrir o editor completo.
        </p>
      </div>
      <AvailabilityBoard establishmentId={establishmentId} role={role} initialProducts={products} />
    </div>
  );
}
