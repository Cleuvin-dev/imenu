import "server-only";
import { AppError } from "@/lib/errors/app-error";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { categorySchema } from "@/modules/catalog/schemas/category.schema";

export async function createCategory(
  establishmentId: string,
  input: unknown,
  requestId: string = crypto.randomUUID(),
) {
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", { requestId, fieldErrors: parsed.error.flatten().fieldErrors });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("categories")
    .insert({
      establishment_id: establishmentId,
      name: parsed.data.name,
      description: parsed.data.description,
      sort_order: parsed.data.sortOrder,
    })
    .select()
    .single();

  if (error) {
    throw new AppError("VALIDATION_ERROR", { requestId, message: error.message });
  }

  return data;
}

export async function updateCategory(
  categoryId: string,
  input: unknown,
  requestId: string = crypto.randomUUID(),
) {
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", { requestId, fieldErrors: parsed.error.flatten().fieldErrors });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("categories")
    .update({
      name: parsed.data.name,
      description: parsed.data.description,
      sort_order: parsed.data.sortOrder,
    })
    .eq("id", categoryId)
    .select()
    .single();

  if (error) {
    throw new AppError("VALIDATION_ERROR", { requestId, message: error.message });
  }

  return data;
}

export async function setCategoryActive(
  categoryId: string,
  isActive: boolean,
  requestId: string = crypto.randomUUID(),
) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("categories")
    .update({ is_active: isActive, archived_at: isActive ? null : new Date().toISOString() })
    .eq("id", categoryId)
    .select()
    .single();

  if (error) {
    throw new AppError("VALIDATION_ERROR", { requestId, message: error.message });
  }

  return data;
}

export async function listCategories(establishmentId: string, requestId: string = crypto.randomUUID()) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("establishment_id", establishmentId)
    .order("sort_order");

  if (error) {
    throw new AppError("INTERNAL_ERROR", { requestId });
  }

  return data;
}
