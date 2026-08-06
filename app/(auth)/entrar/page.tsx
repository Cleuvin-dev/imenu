import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { LoginForm } from "@/app/(auth)/entrar/login-form";

export const metadata: Metadata = {
  title: "Entrar — iMenu",
};

function safeNextPath(value: string | undefined): string | undefined {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return undefined;
  }
  return value;
}

export default async function EntrarPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next: rawNext } = await searchParams;
  const next = safeNextPath(rawNext);

  const user = await getAuthenticatedUser();
  if (user) {
    redirect(next ?? "/painel");
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm rounded-card border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <span className="rounded-chip bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700">iMenu</span>
          <h1 className="text-xl font-semibold text-neutral-950">Entrar no painel</h1>
          <p className="text-sm text-neutral-600">Acesse com o e-mail e a senha da sua equipe.</p>
        </div>
        <LoginForm next={next} />
      </div>
    </main>
  );
}
