import "server-only";
import { AppError, type AppErrorCode } from "@/lib/errors/app-error";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hashInviteToken } from "@/modules/tenancy/domain/invite-token";

const PG_ERROR_TO_APP_ERROR: Record<string, AppErrorCode> = {
  IM040: "INVITE_INVALID",
  IM041: "INVITE_ALREADY_ACCEPTED",
  IM042: "INVITE_EMAIL_MISMATCH",
  "42501": "UNAUTHENTICATED",
};

export type AcceptedInvite = {
  establishmentId: string;
  establishmentSlug: string;
  establishmentTradeName: string;
  role: string;
};

/** Aceita um convite de equipe para o usuário autenticado (docs/02 §6). */
export async function acceptInvite(
  rawToken: string,
  requestId: string = crypto.randomUUID(),
): Promise<AcceptedInvite> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("accept_member_invite", {
    p_token_hash: hashInviteToken(rawToken),
  });

  if (error) {
    const code = PG_ERROR_TO_APP_ERROR[error.code ?? ""] ?? "INTERNAL_ERROR";
    throw new AppError(code, { requestId });
  }

  return data as unknown as AcceptedInvite;
}
