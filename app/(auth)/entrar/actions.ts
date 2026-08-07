"use server";

import { redirect } from "next/navigation";
import { AppError, type AppErrorFieldErrors } from "@/lib/errors/app-error";
import { signIn } from "@/modules/identity/application/sign-in";
import { resolveDefaultLandingPath } from "@/lib/auth/platform";

export type LoginActionState = {
  error?: string;
  fieldErrors?: AppErrorFieldErrors;
};

/** Só aceita um caminho relativo interno (evita open redirect via `next`); ausente/inválido vira `null`. */
function safeNextPath(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string" || value.length === 0 || !value.startsWith("/") || value.startsWith("//")) {
    return null;
  }
  return value;
}

export async function loginAction(
  _prevState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const explicitNext = safeNextPath(formData.get("next"));

  try {
    await signIn({ email, password });
  } catch (err) {
    if (err instanceof AppError) {
      return { error: err.message, fieldErrors: err.fieldErrors };
    }
    return { error: "Não foi possível entrar. Tente novamente." };
  }

  redirect(explicitNext ?? (await resolveDefaultLandingPath()));
}
