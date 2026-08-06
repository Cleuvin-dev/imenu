import "server-only";
import { AppError } from "@/lib/errors/app-error";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireTenantRole, type MemberRole } from "@/lib/auth/tenant";
import { createInviteSchema } from "@/modules/tenancy/schemas/create-invite.schema";
import { generateInviteToken, hashInviteToken, INVITE_EXPIRATION_MS } from "@/modules/tenancy/domain/invite-token";

/** Gerente não pode criar, promover, rebaixar ou remover um owner (docs/02 §3, nota *). */
const MANAGER_FORBIDDEN_ROLES: readonly MemberRole[] = ["owner"];

export type CreatedInvite = {
  id: string;
  email: string;
  role: MemberRole;
  expiresAt: string;
  /** Token bruto do link de convite — só existe nesta resposta, nunca é gravado. */
  rawToken: string;
};

/** Cria um convite de equipe (docs/02 §6, docs/03 RF-EST-012). */
export async function createInvite(
  establishmentId: string,
  input: unknown,
  requestId: string = crypto.randomUUID(),
): Promise<CreatedInvite> {
  const membership = await requireTenantRole(establishmentId, ["owner", "manager"], requestId);

  const parsed = createInviteSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", { requestId, fieldErrors: parsed.error.flatten().fieldErrors });
  }

  if (membership.role === "manager" && MANAGER_FORBIDDEN_ROLES.includes(parsed.data.role)) {
    throw new AppError("FORBIDDEN", {
      requestId,
      message: "Gerente não pode convidar para o papel de proprietário.",
    });
  }

  const rawToken = generateInviteToken();
  const tokenHash = hashInviteToken(rawToken);
  const expiresAt = new Date(Date.now() + INVITE_EXPIRATION_MS).toISOString();

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("member_invites")
    .insert({
      establishment_id: establishmentId,
      email: parsed.data.email,
      role: parsed.data.role,
      token_hash: tokenHash,
      invited_by: membership.userId,
      expires_at: expiresAt,
    })
    .select("id, email, role, expires_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new AppError("VALIDATION_ERROR", {
        requestId,
        message: "Já existe um convite pendente para este e-mail.",
      });
    }
    throw new AppError("INTERNAL_ERROR", { requestId });
  }

  return {
    id: data.id,
    email: data.email,
    role: data.role,
    expiresAt: data.expires_at,
    rawToken,
  };
}
