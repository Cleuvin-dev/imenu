import "server-only";
import { AppError } from "@/lib/errors/app-error";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signUpSchema } from "@/modules/identity/schemas/sign-up.schema";

export type SignUpResult = {
  /** false quando o projeto Supabase exige confirmação de e-mail antes de liberar sessão. */
  sessionActive: boolean;
};

/**
 * Cria conta de equipe (nunca de consumidor — só usado no fluxo de aceite de
 * convite, docs/02 §6). Se a confirmação de e-mail estiver habilitada no
 * projeto Supabase, nenhuma sessão é aberta ainda; o chamador deve orientar
 * o usuário a confirmar o e-mail e entrar normalmente.
 */
export async function signUp(input: unknown, requestId: string = crypto.randomUUID()): Promise<SignUpResult> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", { requestId, fieldErrors: parsed.error.flatten().fieldErrors });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { display_name: parsed.data.displayName } },
  });

  if (error) {
    throw new AppError("VALIDATION_ERROR", {
      requestId,
      message: "Não foi possível criar a conta. Verifique os dados e tente novamente.",
    });
  }

  return { sessionActive: data.session !== null };
}
