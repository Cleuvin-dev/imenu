import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hashInviteToken } from "@/modules/tenancy/domain/invite-token";
import type { Database } from "@/lib/supabase/database-types";

type MemberRole = Database["public"]["Enums"]["member_role"];

export type InvitePreview =
  | { valid: false }
  | { valid: true; email: string; role: MemberRole; establishmentTradeName: string; expiresAt: string };

/**
 * Prévia pública fail-closed do convite (docs/02 §6), usada para mostrar
 * "convite de {estabelecimento}" antes do login/cadastro. Nunca distingue
 * convite inexistente de expirado/revogado/aceito (evita enumeração).
 */
export async function previewInvite(rawToken: string): Promise<InvitePreview> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_member_invite_preview", {
    p_token_hash: hashInviteToken(rawToken),
  });

  if (error || !data) {
    return { valid: false };
  }

  return data as unknown as InvitePreview;
}
