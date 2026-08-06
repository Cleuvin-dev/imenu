"use server";

import { redirect } from "next/navigation";
import { AppError, type AppErrorFieldErrors } from "@/lib/errors/app-error";
import { acceptInvite } from "@/modules/tenancy/application/accept-invite";
import { signUp } from "@/modules/identity/application/sign-up";

export type AcceptInviteActionState = {
  error?: string;
};

export async function acceptInviteAction(
  token: string,
  _prevState: AcceptInviteActionState,
  _formData: FormData,
): Promise<AcceptInviteActionState> {
  try {
    await acceptInvite(token);
  } catch (err) {
    if (err instanceof AppError) {
      return { error: err.message };
    }
    return { error: "Não foi possível aceitar o convite." };
  }

  redirect("/painel");
}

export type SignUpInviteActionState = {
  error?: string;
  fieldErrors?: AppErrorFieldErrors;
  needsEmailConfirmation?: boolean;
};

/** Cria a conta (se necessário) e já aceita o convite numa única submissão. */
export async function signUpInviteAction(
  token: string,
  _prevState: SignUpInviteActionState,
  formData: FormData,
): Promise<SignUpInviteActionState> {
  let sessionActive: boolean;
  try {
    const result = await signUp({
      email: formData.get("email"),
      password: formData.get("password"),
      displayName: formData.get("displayName"),
    });
    sessionActive = result.sessionActive;
  } catch (err) {
    if (err instanceof AppError) {
      return { error: err.message, fieldErrors: err.fieldErrors };
    }
    return { error: "Não foi possível criar a conta." };
  }

  if (!sessionActive) {
    return { needsEmailConfirmation: true };
  }

  try {
    await acceptInvite(token);
  } catch (err) {
    if (err instanceof AppError) {
      return { error: `Conta criada, mas o convite não pôde ser aceito automaticamente: ${err.message}` };
    }
    return { error: "Conta criada, mas não foi possível aceitar o convite. Entre e tente novamente." };
  }

  redirect("/painel");
}
