import "server-only";
import { AppError } from "@/lib/errors/app-error";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requirePlatformAdmin } from "@/lib/auth/platform";
import type { Database } from "@/lib/supabase/database-types";

type PlatformRole = Database["public"]["Enums"]["platform_role"];

export type PlatformAdminRow = {
  userId: string;
  displayName: string;
  email: string;
  role: PlatformRole;
  isActive: boolean;
  createdAt: string;
};

/** Lista administradores da plataforma (docs/03 RF-ADM-014, docs/04 A-06). Somente super_admin. */
export async function listPlatformAdmins(requestId: string = crypto.randomUUID()): Promise<PlatformAdminRow[]> {
  await requirePlatformAdmin(["super_admin"], requestId);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("platform_admins")
    .select("user_id, role, is_active, created_at, profile:profiles!platform_admins_user_id_fkey(display_name, email)")
    .order("created_at");

  if (error) {
    throw new AppError("INTERNAL_ERROR", { requestId });
  }

  return (data ?? [])
    .filter((row) => row.profile !== null)
    .map((row) => ({
      userId: row.user_id,
      displayName: row.profile!.display_name,
      email: row.profile!.email,
      role: row.role,
      isActive: row.is_active,
      createdAt: row.created_at,
    }));
}
