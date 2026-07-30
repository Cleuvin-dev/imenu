import "server-only";
import { AppError } from "@/lib/errors/app-error";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { productSchema } from "@/modules/catalog/schemas/product.schema";
import { slugify } from "@/modules/catalog/domain/slug";

async function generateUniqueSlug(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  establishmentId: string,
  name: string,
  ignoreProductId?: string,
): Promise<string> {
  const base = slugify(name) || "produto";
  let candidate = base;
  let attempt = 1;

  while (attempt < 50) {
    let query = supabase
      .from("products")
      .select("id")
      .eq("establishment_id", establishmentId)
      .eq("slug", candidate);

    if (ignoreProductId) {
      query = query.neq("id", ignoreProductId);
    }

    const { data, error } = await query.maybeSingle();
    if (error) break;
    if (!data) return candidate;

    attempt += 1;
    candidate = `${base}-${attempt}`;
  }

  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

export async function createProduct(
  establishmentId: string,
  input: unknown,
  requestId: string = crypto.randomUUID(),
) {
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", { requestId, fieldErrors: parsed.error.flatten().fieldErrors });
  }

  const supabase = await createSupabaseServerClient();
  const slug = await generateUniqueSlug(supabase, establishmentId, parsed.data.name);

  const { data, error } = await supabase
    .from("products")
    .insert({
      establishment_id: establishmentId,
      category_id: parsed.data.categoryId,
      name: parsed.data.name,
      slug,
      short_description: parsed.data.shortDescription,
      description: parsed.data.description,
      ingredients: parsed.data.ingredients,
      allergens: parsed.data.allergens,
      base_price_cents: parsed.data.basePriceCents,
    })
    .select()
    .single();

  if (error) {
    throw new AppError("VALIDATION_ERROR", { requestId, message: error.message });
  }

  return data;
}

export async function updateProduct(
  productId: string,
  input: unknown,
  requestId: string = crypto.randomUUID(),
) {
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", { requestId, fieldErrors: parsed.error.flatten().fieldErrors });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .update({
      category_id: parsed.data.categoryId,
      name: parsed.data.name,
      short_description: parsed.data.shortDescription,
      description: parsed.data.description,
      ingredients: parsed.data.ingredients,
      allergens: parsed.data.allergens,
      base_price_cents: parsed.data.basePriceCents,
    })
    .eq("id", productId)
    .select()
    .single();

  if (error) {
    throw new AppError("VALIDATION_ERROR", { requestId, message: error.message });
  }

  return data;
}

export async function archiveProduct(productId: string, requestId: string = crypto.randomUUID()) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .update({ status: "archived", archived_at: new Date().toISOString() })
    .eq("id", productId)
    .select()
    .single();

  if (error) {
    throw new AppError("VALIDATION_ERROR", { requestId, message: error.message });
  }

  return data;
}

export async function publishProduct(productId: string, requestId: string = crypto.randomUUID()) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("publish_product", { p_product_id: productId });

  if (error) {
    throw new AppError("VALIDATION_ERROR", { requestId, message: error.message });
  }

  return data;
}

export async function setProductAvailability(
  productId: string,
  isAvailable: boolean,
  requestId: string = crypto.randomUUID(),
) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("set_product_availability", {
    p_product_id: productId,
    p_is_available: isAvailable,
  });

  if (error) {
    throw new AppError("VALIDATION_ERROR", { requestId, message: error.message });
  }

  return data;
}

export async function listProducts(establishmentId: string, requestId: string = crypto.randomUUID()) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select("*, category:categories(name)")
    .eq("establishment_id", establishmentId)
    .order("sort_order");

  if (error) {
    throw new AppError("INTERNAL_ERROR", { requestId });
  }

  return data;
}

export async function getProduct(productId: string, requestId: string = crypto.randomUUID()) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("products").select("*").eq("id", productId).maybeSingle();

  if (error) {
    throw new AppError("INTERNAL_ERROR", { requestId });
  }

  return data;
}
