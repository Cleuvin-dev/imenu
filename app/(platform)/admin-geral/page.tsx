import type { Metadata } from "next";
import Link from "next/link";
import { getPlatformAdminContext } from "@/lib/auth/platform";
import { PLATFORM_ROLE_LABELS } from "@/modules/platform-admin/domain/platform-role-labels";

export const metadata: Metadata = {
  title: "Administração geral — iMenu",
};

export default async function AdminGeralPage() {
  const admin = await getPlatformAdminContext();
  if (!admin) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold text-neutral-950">Painel geral do iMenu</h1>
        <p className="text-sm text-neutral-600">
          Acesso confirmado como {PLATFORM_ROLE_LABELS[admin.role]}. Planos e administradores da plataforma serão
          adicionados nas próximas fases do MVP.
        </p>
      </div>
      <Link
        href="/admin-geral/estabelecimentos"
        className="w-fit rounded-control bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700"
      >
        Ver estabelecimentos
      </Link>
    </div>
  );
}
