import "server-only";
import { AppError } from "@/lib/errors/app-error";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { optionGroupSchema, optionSchema } from "@/modules/catalog/schemas/option.schema";

export async function createOptionGroup(
  establishmentId: string,
  input: unknown,
  requestId: string = crypto.randomUUID(),
) {
  const parsed = optionGroupSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", { requestId, fieldErrors: parsed.error.flatten().fieldErrors });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("option_groups")
    .insert({
      establishment_id: establishmentId,
      name: parsed.data.name,
      min_select: parsed.data.minSelect,
      max_select: parsed.data.maxSelect,
    })
    .select()
    .single();

  if (error) {
    throw new AppError("VALIDATION_ERROR", { requestId, message: error.message });
  }

  return data;
}

export async function createOption(
  establishmentId: string,
  input: unknown,
  requestId: string = crypto.randomUUID(),
) {
  const parsed = optionSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", { requestId, fieldErrors: parsed.error.flatten().fieldErrors });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("options")
    .insert({
      establishment_id: establishmentId,
      option_group_id: parsed.data.optionGroupId,
      name: parsed.data.name,
      price_delta_cents: parsed.data.priceDeltaCents,
    })
    .select()
    .single();

  if (error) {
    throw new AppError("VALIDATION_ERROR", { requestId, message: error.message });
  }

  return data;
}

export async function attachOptionGroupToProduct(
  establishmentId: string,
  productId: string,
  optionGroupId: string,
  requestId: string = crypto.randomUUID(),
) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("product_option_groups")
    .insert({ establishment_id: establishmentId, product_id: productId, option_group_id: optionGroupId })
    .select()
    .single();

  if (error) {
    throw new AppError("VALIDATION_ERROR", { requestId, message: error.message });
  }

  return data;
}

export async function detachOptionGroupFromProduct(
  productId: string,
  optionGroupId: string,
  requestId: string = crypto.randomUUID(),
) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("product_option_groups")
    .delete()
    .eq("product_id", productId)
    .eq("option_group_id", optionGroupId);

  if (error) {
    throw new AppError("VALIDATION_ERROR", { requestId, message: error.message });
  }
}

export async function listOptionGroups(establishmentId: string, requestId: string = crypto.randomUUID()) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("option_groups")
    .select("*, options(*)")
    .eq("establishment_id", establishmentId)
    .order("sort_order");

  if (error) {
    throw new AppError("INTERNAL_ERROR", { requestId });
  }

  return data;
}

export async function listProductOptionGroups(productId: string, requestId: string = crypto.randomUUID()) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("product_option_groups")
    .select("option_group_id, sort_order, option_group:option_groups(*, options(*))")
    .eq("product_id", productId)
    .order("sort_order");

  if (error) {
    throw new AppError("INTERNAL_ERROR", { requestId });
  }

  return data;
}
