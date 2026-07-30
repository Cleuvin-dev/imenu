import "server-only";
import { randomBytes } from "node:crypto";
import { AppError } from "@/lib/errors/app-error";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { tableSchema } from "@/modules/tables/schemas/table.schema";

export async function createTable(
  establishmentId: string,
  input: unknown,
  requestId: string = crypto.randomUUID(),
) {
  const parsed = tableSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", { requestId, fieldErrors: parsed.error.flatten().fieldErrors });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("dining_tables")
    .insert({ establishment_id: establishmentId, name: parsed.data.name, sort_order: parsed.data.sortOrder })
    .select()
    .single();

  if (error) {
    throw new AppError("VALIDATION_ERROR", { requestId, message: error.message });
  }

  return data;
}

export async function updateTable(tableId: string, input: unknown, requestId: string = crypto.randomUUID()) {
  const parsed = tableSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", { requestId, fieldErrors: parsed.error.flatten().fieldErrors });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("dining_tables")
    .update({ name: parsed.data.name, sort_order: parsed.data.sortOrder })
    .eq("id", tableId)
    .select()
    .single();

  if (error) {
    throw new AppError("VALIDATION_ERROR", { requestId, message: error.message });
  }

  return data;
}

export async function setTableActive(tableId: string, isActive: boolean, requestId: string = crypto.randomUUID()) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("dining_tables")
    .update({ is_active: isActive })
    .eq("id", tableId)
    .select()
    .single();

  if (error) {
    throw new AppError("VALIDATION_ERROR", { requestId, message: error.message });
  }

  return data;
}

/**
 * Gera um novo token de alta entropia e incrementa a versão — o QR anterior
 * para de funcionar imediatamente (docs/05 §7, AC-QR-001).
 */
export async function regenerateTableToken(tableId: string, requestId: string = crypto.randomUUID()) {
  const supabase = await createSupabaseServerClient();

  const { data: current, error: findError } = await supabase
    .from("dining_tables")
    .select("token_version")
    .eq("id", tableId)
    .maybeSingle();

  if (findError || !current) {
    throw new AppError("NOT_FOUND", { requestId });
  }

  const newToken = randomBytes(24).toString("hex");

  const { data, error } = await supabase
    .from("dining_tables")
    .update({ public_token: newToken, token_version: current.token_version + 1 })
    .eq("id", tableId)
    .select()
    .single();

  if (error) {
    throw new AppError("VALIDATION_ERROR", { requestId, message: error.message });
  }

  return data;
}

export async function listTables(establishmentId: string, requestId: string = crypto.randomUUID()) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("dining_tables")
    .select("*")
    .eq("establishment_id", establishmentId)
    .order("sort_order");

  if (error) {
    throw new AppError("INTERNAL_ERROR", { requestId });
  }

  return data;
}

export async function getTable(tableId: string, requestId: string = crypto.randomUUID()) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("dining_tables").select("*").eq("id", tableId).maybeSingle();

  if (error) {
    throw new AppError("INTERNAL_ERROR", { requestId });
  }

  return data;
}
