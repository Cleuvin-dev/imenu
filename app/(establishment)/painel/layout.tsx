import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { getPlatformAdminContext } from "@/lib/auth/platform";
import { resolveActiveEstablishment } from "@/modules/tenancy/application/resolve-active-establishment";
import { MEMBER_ROLE_LABELS } from "@/modules/tenancy/domain/member-role-labels";
import { selectEstablishmentAction, clearActiveEstablishmentAction, signOutAction } from "@/app/(establishment)/painel/actions";
import { evaluateEstablishmentAccess } from "@/modules/billing/application/evaluate-establishment-access";
import { OwnerBillingSummary } from "@/app/(establishment)/painel/owner-billing-summary";
import { PainelQueryProvider } from "@/app/(establishment)/painel/query-provider";

// Nunca prerenderizar em build: toda a árvore depende de sessão/cookies do
// usuário. Sem isso, uma página-folha sem chamada dinâmica própria (ex.:
// um redirect puro) pode ser escolhida pelo Next para pré-renderização em
// build, executando este layout antes de qualquer variável de ambiente de
// runtime estar disponível (quebra o build inteiro em vez de virar página
// dinâmica normal).
export const dynamic = "force-dynamic";

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/entrar");
  }

  const resolution = await resolveActiveEstablishment();

  if (resolution.status === "none") {
    const platformAdmin = await getPlatformAdminContext();
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
        <span className="rounded-chip bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700">iMenu</span>
        <h1 className="text-xl font-semibold text-neutral-950">Nenhum estabelecimento disponível</h1>
        <p className="max-w-md text-sm text-neutral-600">
          Sua conta ainda não está associada a nenhum estabelecimento ativo. Peça a um proprietário ou gerente
          para te convidar para a equipe.
        </p>
        {platformAdmin ? (
          <a href="/admin-geral" className="text-sm font-medium text-primary-700 underline underline-offset-2">
            Ir para o painel geral do iMenu
          </a>
        ) : null}
        <form action={signOutAction}>
          <button type="submit" className="text-sm font-medium text-neutral-600 underline underline-offset-2">
            Sair
          </button>
        </form>
      </main>
    );
  }

  if (resolution.status === "selection_required") {
    return (
      <main className="flex flex-1 flex-col items-center gap-6 px-6 py-16">
        <span className="rounded-chip bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700">iMenu</span>
        <h1 className="text-xl font-semibold text-neutral-950">Selecione um estabelecimento</h1>
        <ul className="flex w-full max-w-sm flex-col gap-3">
          {resolution.establishments.map((establishment) => (
            <li key={establishment.establishmentId}>
              <form action={selectEstablishmentAction}>
                <input type="hidden" name="establishmentId" value={establishment.establishmentId} />
                <button
                  type="submit"
                  className="w-full rounded-card border border-neutral-200 bg-white px-4 py-3 text-left text-sm font-medium text-neutral-950 transition hover:border-primary-600"
                >
                  {establishment.tradeName}
                  <span className="mt-0.5 block text-xs font-normal text-neutral-600">
                    {MEMBER_ROLE_LABELS[establishment.role]}
                  </span>
                </button>
              </form>
            </li>
          ))}
        </ul>
      </main>
    );
  }

  const { establishment, establishments } = resolution;
  const access = await evaluateEstablishmentAccess(establishment.establishmentId);

  const header = (
    <header className="flex items-center justify-between gap-4 border-b border-neutral-200 bg-white px-4 py-3 sm:px-6">
      <div>
        <p className="text-sm font-semibold text-neutral-950">{establishment.tradeName}</p>
        <p className="text-xs text-neutral-600">{MEMBER_ROLE_LABELS[establishment.role]}</p>
      </div>
      <div className="flex items-center gap-4">
        {establishments.length > 1 ? (
          <form action={clearActiveEstablishmentAction}>
            <button type="submit" className="text-sm font-medium text-primary-700 hover:underline">
              Trocar estabelecimento
            </button>
          </form>
        ) : null}
        <form action={signOutAction}>
          <button type="submit" className="text-sm font-medium text-neutral-600 hover:underline">
            Sair
          </button>
        </form>
      </div>
    </header>
  );

  if (!access.allowed) {
    return (
      <div className="flex min-h-full flex-1 flex-col">
        {header}
        <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center sm:px-6">
          <h1 className="text-xl font-semibold text-neutral-950">Acesso operacional indisponível</h1>
          {establishment.role === "owner" ? (
            <>
              <p className="max-w-md text-sm text-neutral-600">
                O acesso ao painel está bloqueado por uma pendência na assinatura. Veja abaixo a situação atual.
              </p>
              <OwnerBillingSummary establishmentId={establishment.establishmentId} />
            </>
          ) : (
            <p className="max-w-md text-sm text-neutral-600">
              O acesso operacional deste estabelecimento está temporariamente indisponível. Fale com o
              proprietário do estabelecimento.
            </p>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      {header}
      <main className="flex flex-1 flex-col px-4 py-6 sm:px-6">
        <PainelQueryProvider>{children}</PainelQueryProvider>
      </main>
    </div>
  );
}
