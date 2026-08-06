import type { Metadata } from "next";
import Link from "next/link";
import { resolveActiveEstablishment } from "@/modules/tenancy/application/resolve-active-establishment";
import { MEMBER_ROLE_LABELS } from "@/modules/tenancy/domain/member-role-labels";
import { getEstablishmentDashboard } from "@/modules/operations/application/get-establishment-dashboard";

export const metadata: Metadata = {
  title: "Painel — iMenu",
};

const NAV_LINKS: { href: string; label: string }[] = [
  { href: "/painel/pedidos", label: "Pedidos (KDS)" },
  { href: "/painel/caixa", label: "Caixa" },
  { href: "/painel/disponibilidade", label: "Disponibilidade rápida" },
  { href: "/painel/cardapio/produtos", label: "Cardápio: produtos" },
  { href: "/painel/cardapio/categorias", label: "Cardápio: categorias" },
  { href: "/painel/mesas", label: "Mesas e QR Codes" },
  { href: "/painel/equipe", label: "Equipe" },
  { href: "/painel/horarios", label: "Horários e operação" },
  { href: "/painel/assinatura", label: "Assinatura" },
];

export default async function PainelPage() {
  const resolution = await resolveActiveEstablishment();

  if (resolution.status !== "active") {
    return null;
  }

  const { establishment } = resolution;
  const dashboard = await getEstablishmentDashboard(establishment.establishmentId);

  const cards: { label: string; value: number | string }[] = [
    { label: "Novos", value: dashboard.ordersToday.new },
    { label: "Em preparo", value: dashboard.ordersToday.preparing },
    { label: "Prontos", value: dashboard.ordersToday.ready },
    { label: "Entregues", value: dashboard.ordersToday.delivered },
    { label: "Pedidos totais hoje", value: dashboard.ordersToday.total },
    {
      label: "Tempo médio de preparo",
      value: dashboard.averagePreparationMinutes !== null ? `${dashboard.averagePreparationMinutes} min` : "—",
    },
    { label: "Solicitações de conta ativas", value: dashboard.activeBillRequests },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold text-neutral-950">Painel de {establishment.tradeName}</h1>
        <p className="text-sm text-neutral-600">Acesso confirmado como {MEMBER_ROLE_LABELS[establishment.role]}.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-card border border-neutral-200 bg-white p-4">
            <p className="text-2xl font-semibold text-neutral-950">{card.value}</p>
            <p className="text-xs text-neutral-600">{card.label}</p>
          </div>
        ))}
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
    </div>
  );
}
