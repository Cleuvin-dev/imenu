import "server-only";
import type { User } from "@supabase/supabase-js";
import { AppError } from "@/lib/errors/app-error";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Sempre usa `getUser()` (valida o JWT junto ao Supabase Auth), nunca
 * `getSession()`, que apenas lê o cookie sem revalidar o token.
 */
export async function getAuthenticatedUser(): Promise<User | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

export async function requireAuthenticatedUser(requestId: string = crypto.randomUUID()): Promise<User> {
  const user = await getAuthenticatedUser();
  if (!user) {
    throw new AppError("UNAUTHENTICATED", { requestId });
  }
  return user;
}
