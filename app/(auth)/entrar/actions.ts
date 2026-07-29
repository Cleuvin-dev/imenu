"use server";

import { redirect } from "next/navigation";
import { AppError, type AppErrorFieldErrors } from "@/lib/errors/app-error";
import { signIn } from "@/modules/identity/application/sign-in";

export type LoginActionState = {
  error?: string;
  fieldErrors?: AppErrorFieldErrors;
};

export async function loginAction(
  _prevState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  try {
    await signIn({ email, password });
  } catch (err) {
    if (err instanceof AppError) {
      return { error: err.message, fieldErrors: err.fieldErrors };
    }
    return { error: "Não foi possível entrar. Tente novamente." };
  }

  redirect("/painel");
}
