import "server-only";
import { AppError } from "@/lib/errors/app-error";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requirePlatformAdmin } from "@/lib/auth/platform";
import { auditFilterSchema } from "@/modules/audit/schemas/audit-filter.schema";
import type { Database } from "@/lib/supabase/database-types";

type AuditActorScope = Database["public"]["Enums"]["audit_actor_scope"];

export type AuditLogEntry = {
  id: string;
  actorDisplayName: string | null;
  actorEmail: string | null;
  actorScope: AuditActorScope;
  establishmentId: string | null;
  establishmentTradeName: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  beforeData: unknown;
  afterData: unknown;
  createdAt: string;
};

/**
 * Auditoria consultável (docs/03 RF-ADM-015, docs/04 A-07). `platform_support`
 * vê a lista de eventos, mas não o conteúdo antes/depois (docs/02 §4,
 * matriz da plataforma: auditoria é "L limitada" para support).
 */
export async function listAuditLogs(rawFilters: unknown, requestId: string = crypto.randomUUID()): Promise<AuditLogEntry[]> {
  const actor = await requirePlatformAdmin(undefined, requestId);
  const filters = auditFilterSchema.parse(rawFilters);

  const supabase = await createSupabaseServerClient();

  let actorUserId: string | undefined;
  if (filters.actorEmail) {
    const { data: profile } = await supabase.from("profiles").select("id").eq("email", filters.actorEmail).maybeSingle();
    actorUserId = profile?.id ?? "00000000-0000-0000-0000-000000000000";
  }

  let query = supabase
    .from("audit_logs")
    .select(
      "id, actor_scope, establishment_id, action, resource_type, resource_id, before_data, after_data, created_at, actor:profiles(display_name, email), establishment:establishments(trade_name)",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (actorUserId) query = query.eq("actor_user_id", actorUserId);
  if (filters.action) query = query.ilike("action", `%${filters.action}%`);
  if (filters.resourceType) query = query.eq("resource_type", filters.resourceType);
  if (filters.establishmentId) query = query.eq("establishment_id", filters.establishmentId);
  if (filters.dateFrom) query = query.gte("created_at", filters.dateFrom);
  if (filters.dateTo) query = query.lte("created_at", filters.dateTo);

  const { data, error } = await query;
  if (error) {
    throw new AppError("INTERNAL_ERROR", { requestId });
  }

  const maskSensitive = actor.role === "platform_support";

  return (data ?? []).map((row) => ({
    id: row.id,
    actorDisplayName: row.actor?.display_name ?? null,
    actorEmail: row.actor?.email ?? null,
    actorScope: row.actor_scope,
    establishmentId: row.establishment_id,
    establishmentTradeName: row.establishment?.trade_name ?? null,
    action: row.action,
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    beforeData: maskSensitive ? null : row.before_data,
    afterData: maskSensitive ? null : row.after_data,
    createdAt: row.created_at,
  }));
}
