import "server-only";
import { AppError } from "@/lib/errors/app-error";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireTenantRole } from "@/lib/auth/tenant";
import {
  upsertBusinessHourSchema,
  upsertBusinessHourExceptionSchema,
} from "@/modules/catalog/schemas/business-hours.schema";

const HOURS_MANAGE_ROLES = ["owner", "manager"] as const;

export type BusinessHourRow = {
  weekday: number;
  isClosed: boolean;
  opensAt: string | null;
  closesAt: string | null;
};

export type BusinessHourException = {
  id: string;
  date: string;
  isClosed: boolean;
  opensAt: string | null;
  closesAt: string | null;
  note: string | null;
};

/** Lê a grade semanal (docs/03 RF-EST-009) e as próximas exceções cadastradas. */
export async function listBusinessHours(
  establishmentId: string,
  requestId: string = crypto.randomUUID(),
): Promise<{ hours: BusinessHourRow[]; exceptions: BusinessHourException[] }> {
  const supabase = await createSupabaseServerClient();

  const [hoursResult, exceptionsResult] = await Promise.all([
    supabase
      .from("business_hours")
      .select("weekday, is_closed, opens_at, closes_at")
      .eq("establishment_id", establishmentId)
      .order("weekday"),
    supabase
      .from("business_hour_exceptions")
      .select("id, date, is_closed, opens_at, closes_at, note")
      .eq("establishment_id", establishmentId)
      .gte("date", new Date().toISOString().slice(0, 10))
      .order("date")
      .limit(30),
  ]);

  if (hoursResult.error || exceptionsResult.error) {
    throw new AppError("INTERNAL_ERROR", { requestId });
  }

  const configured = new Map(
    (hoursResult.data ?? []).map((row) => [
      row.weekday,
      { weekday: row.weekday, isClosed: row.is_closed, opensAt: row.opens_at, closesAt: row.closes_at },
    ]),
  );

  const hours: BusinessHourRow[] = Array.from({ length: 7 }, (_, weekday) =>
    configured.get(weekday) ?? { weekday, isClosed: true, opensAt: null, closesAt: null },
  );

  return {
    hours,
    exceptions: (exceptionsResult.data ?? []).map((row) => ({
      id: row.id,
      date: row.date,
      isClosed: row.is_closed,
      opensAt: row.opens_at,
      closesAt: row.closes_at,
      note: row.note,
    })),
  };
}

/** Cria ou substitui o horário de um dia da semana (único por establishment_id+weekday). */
export async function upsertBusinessHour(
  establishmentId: string,
  input: unknown,
  requestId: string = crypto.randomUUID(),
): Promise<void> {
  await requireTenantRole(establishmentId, HOURS_MANAGE_ROLES, requestId);

  const parsed = upsertBusinessHourSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", { requestId, fieldErrors: parsed.error.flatten().fieldErrors });
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("business_hours").upsert(
    {
      establishment_id: establishmentId,
      weekday: parsed.data.weekday,
      is_closed: parsed.data.isClosed,
      opens_at: parsed.data.isClosed ? null : parsed.data.opensAt,
      closes_at: parsed.data.isClosed ? null : parsed.data.closesAt,
    },
    { onConflict: "establishment_id,weekday" },
  );

  if (error) {
    throw new AppError("INTERNAL_ERROR", { requestId });
  }
}

/** Cria ou substitui a exceção de uma data específica (docs/03 RF-EST-009). */
export async function upsertBusinessHourException(
  establishmentId: string,
  input: unknown,
  requestId: string = crypto.randomUUID(),
): Promise<void> {
  await requireTenantRole(establishmentId, HOURS_MANAGE_ROLES, requestId);

  const parsed = upsertBusinessHourExceptionSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", { requestId, fieldErrors: parsed.error.flatten().fieldErrors });
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("business_hour_exceptions").upsert(
    {
      establishment_id: establishmentId,
      date: parsed.data.date,
      is_closed: parsed.data.isClosed,
      opens_at: parsed.data.isClosed ? null : parsed.data.opensAt,
      closes_at: parsed.data.isClosed ? null : parsed.data.closesAt,
      note: parsed.data.note || null,
    },
    { onConflict: "establishment_id,date" },
  );

  if (error) {
    throw new AppError("INTERNAL_ERROR", { requestId });
  }
}

export async function deleteBusinessHourException(
  establishmentId: string,
  exceptionId: string,
  requestId: string = crypto.randomUUID(),
): Promise<void> {
  await requireTenantRole(establishmentId, HOURS_MANAGE_ROLES, requestId);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("business_hour_exceptions")
    .delete()
    .eq("id", exceptionId)
    .eq("establishment_id", establishmentId);

  if (error) {
    throw new AppError("INTERNAL_ERROR", { requestId });
  }
}

/** Alterna manualmente se o estabelecimento aceita novos pedidos agora (docs/03 RF-EST-008). */
export async function setAcceptingOrders(
  establishmentId: string,
  acceptingOrders: boolean,
  requestId: string = crypto.randomUUID(),
): Promise<void> {
  await requireTenantRole(establishmentId, HOURS_MANAGE_ROLES, requestId);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("establishments")
    .update({ accepting_orders: acceptingOrders })
    .eq("id", establishmentId);

  if (error) {
    throw new AppError("INTERNAL_ERROR", { requestId });
  }
}
