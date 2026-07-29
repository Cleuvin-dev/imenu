import "server-only";
import { AppError } from "@/lib/errors/app-error";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loginSchema, type LoginInput } from "@/modules/identity/schemas/login.schema";

/**
 * Autentica um funcionário/administrador por e-mail e senha. A mensagem de
 * erro nunca revela se o e-mail existe (evita enumeração de contas).
 */
export async function signIn(input: LoginInput, requestId: string = crypto.randomUUID()): Promise<void> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", {
      requestId,
      fieldErrors: parsed.error.flatten().fieldErrors,
    });
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    throw new AppError("UNAUTHENTICATED", {
      requestId,
      message: "E-mail ou senha inválidos.",
    });
  }
}

export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
}
