import "server-only";
import { AppError } from "@/lib/errors/app-error";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireTenantRole } from "@/lib/auth/tenant";
import type { Database } from "@/lib/supabase/database-types";

type MemberRole = Database["public"]["Enums"]["member_role"];

export type TeamMember = {
  id: string;
  userId: string;
  displayName: string;
  email: string;
  role: MemberRole;
  isActive: boolean;
  createdAt: string;
};

export type PendingInvite = {
  id: string;
  email: string;
  role: MemberRole;
  expiresAt: string;
  createdAt: string;
};

/** Lista membros (via RPC, único jeito de ver nome/e-mail de colegas) e convites pendentes. */
export async function listTeam(
  establishmentId: string,
  requestId: string = crypto.randomUUID(),
): Promise<{ members: TeamMember[]; pendingInvites: PendingInvite[] }> {
  await requireTenantRole(establishmentId, ["owner", "manager"], requestId);

  const supabase = await createSupabaseServerClient();

  const [membersResult, invitesResult] = await Promise.all([
    supabase.rpc("list_establishment_team", { p_establishment_id: establishmentId }),
    supabase
      .from("member_invites")
      .select("id, email, role, expires_at, created_at")
      .eq("establishment_id", establishmentId)
      .is("accepted_at", null)
      .is("revoked_at", null)
      .order("created_at", { ascending: false }),
  ]);

  if (membersResult.error || invitesResult.error) {
    throw new AppError("INTERNAL_ERROR", { requestId });
  }

  return {
    members: (membersResult.data as unknown as TeamMember[] | null) ?? [],
    pendingInvites: (invitesResult.data ?? []).map((invite) => ({
      id: invite.id,
      email: invite.email,
      role: invite.role,
      expiresAt: invite.expires_at,
      createdAt: invite.created_at,
    })),
  };
}
