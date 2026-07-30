import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { getPlatformAdminContext } from "@/lib/auth/platform";
import { PLATFORM_ROLE_LABELS } from "@/modules/platform-admin/domain/platform-role-labels";
import { signOutAction } from "@/app/(platform)/admin-geral/actions";

// Ver justificativa em app/(establishment)/painel/layout.tsx.
export const dynamic = "force-dynamic";

export default async function AdminGeralLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/entrar");
  }

  const admin = await getPlatformAdminContext();

  if (!admin) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
        <h1 className="text-xl font-semibold text-neutral-950">Acesso restrito</h1>
        <p className="max-w-md text-sm text-neutral-600">
          Esta área é exclusiva da administração geral do iMenu. Sua conta não tem permissão de administrador da
          plataforma.
        </p>
        <a href="/painel" className="text-sm font-medium text-primary-700 underline underline-offset-2">
          Ir para o painel do estabelecimento
        </a>
        <form action={signOutAction}>
          <button type="submit" className="text-sm font-medium text-neutral-600 underline underline-offset-2">
            Sair
          </button>
        </form>
      </main>
    );
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="flex items-center justify-between gap-4 border-b border-neutral-200 bg-white px-4 py-3 sm:px-6">
        <div>
          <p className="text-sm font-semibold text-neutral-950">Administração geral do iMenu</p>
          <p className="text-xs text-neutral-600">{PLATFORM_ROLE_LABELS[admin.role]}</p>
        </div>
        <form action={signOutAction}>
          <button type="submit" className="text-sm font-medium text-neutral-600 hover:underline">
            Sair
          </button>
        </form>
      </header>
      <main className="flex flex-1 flex-col px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
