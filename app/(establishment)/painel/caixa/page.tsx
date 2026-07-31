import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { resolveActiveEstablishment } from "@/modules/tenancy/application/resolve-active-establishment";
import { listCaixaBoard } from "@/modules/service-session/application/list-caixa-board";
import { CaixaBoard } from "@/app/(establishment)/painel/caixa/caixa-board";
import type { Database } from "@/lib/supabase/database-types";

type MemberRole = Database["public"]["Enums"]["member_role"];

// docs/02 §3: "Solicitações de conta" é L (leitura) para owner/manager/kitchen/cashier/viewer; menu_editor não tem acesso.
const CAIXA_READ_ROLES: readonly MemberRole[] = ["owner", "manager", "kitchen", "cashier", "viewer"];

export const metadata: Metadata = {
  title: "Caixa — iMenu",
};

export default async function CaixaPage() {
  const resolution = await resolveActiveEstablishment();
  if (resolution.status !== "active") {
    redirect("/painel");
  }

  const { establishmentId, role } = resolution.establishment;

  if (!CAIXA_READ_ROLES.includes(role)) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center">
        <h1 className="text-lg font-semibold text-neutral-950">Acesso restrito</h1>
        <p className="max-w-sm text-sm text-neutral-600">
          Seu papel não tem acesso ao caixa. Fale com o proprietário ou gerente do estabelecimento.
        </p>
      </div>
    );
  }

  const board = await listCaixaBoard(establishmentId);

  return <CaixaBoard establishmentId={establishmentId} role={role} initialBoard={board} />;
}
