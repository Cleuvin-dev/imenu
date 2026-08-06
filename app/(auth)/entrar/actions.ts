"use server";

import { redirect } from "next/navigation";
import { AppError, type AppErrorFieldErrors } from "@/lib/errors/app-error";
import { signIn } from "@/modules/identity/application/sign-in";

export type LoginActionState = {
  error?: string;
  fieldErrors?: AppErrorFieldErrors;
};

/** Só aceita um caminho relativo interno (evita open redirect via `next`). */
function safeNextPath(value: FormDataEntryValue | null): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/painel";
  }
  return value;
}

export async function loginAction(
  _prevState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = safeNextPath(formData.get("next"));

  try {
    await signIn({ email, password });
  } catch (err) {
    if (err instanceof AppError) {
      return { error: err.message, fieldErrors: err.fieldErrors };
    }
    return { error: "Não foi possível entrar. Tente novamente." };
  }

  redirect(next);
}
