import type { Metadata } from "next";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { previewInvite } from "@/modules/tenancy/application/preview-invite";
import { MEMBER_ROLE_LABELS } from "@/modules/tenancy/domain/member-role-labels";
import { formatDateTimePtBr } from "@/lib/dates";
import { AcceptInviteForm } from "@/app/(auth)/convite/[token]/accept-invite-form";
import { SignUpInviteForm } from "@/app/(auth)/convite/[token]/sign-up-invite-form";

export const metadata: Metadata = {
  title: "Convite — iMenu",
};

// Nunca prerenderizar: depende de sessão/cookies e de uma leitura em tempo real do banco.
export const dynamic = "force-dynamic";

export default async function ConvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const preview = await previewInvite(token);

  if (!preview.valid) {
    return (
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm rounded-card border border-neutral-200 bg-white p-6 text-center shadow-sm">
          <span className="rounded-chip bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700">iMenu</span>
          <h1 className="mt-4 text-lg font-semibold text-neutral-950">Convite inválido</h1>
          <p className="mt-2 text-sm text-neutral-600">
            Este link não existe, foi revogado, expirou ou já foi utilizado. Peça um novo convite ao responsável
            pelo estabelecimento.
          </p>
        </div>
      </main>
    );
  }

  const user = await getAuthenticatedUser();

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm rounded-card border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <span className="rounded-chip bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700">iMenu</span>
          <h1 className="text-xl font-semibold text-neutral-950">Convite para {preview.establishmentTradeName}</h1>
          <p className="text-sm text-neutral-600">
            Papel: {MEMBER_ROLE_LABELS[preview.role]}
          </p>
          <p className="text-xs text-neutral-500">
            E-mail convidado: <strong>{preview.email}</strong> · expira em {formatDateTimePtBr(preview.expiresAt)}
          </p>
        </div>

        {user ? (
          <AcceptInviteForm token={token} />
        ) : (
          <div className="flex flex-col gap-6">
            <SignUpInviteForm token={token} email={preview.email} />
            <div className="flex items-center gap-3 text-xs text-neutral-500">
              <span className="h-px flex-1 bg-neutral-200" />
              já tem conta?
              <span className="h-px flex-1 bg-neutral-200" />
            </div>
            <a
              href={`/entrar?next=${encodeURIComponent(`/convite/${token}`)}`}
              className="text-center text-sm font-medium text-primary-700 hover:underline"
            >
              Entrar com uma conta existente
            </a>
          </div>
        )}
      </div>
    </main>
  );
}
