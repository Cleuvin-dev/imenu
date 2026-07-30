import "server-only";
import { AppError } from "@/lib/errors/app-error";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { validateMediaUpload } from "@/modules/media/domain/validate-upload";
import { buildProductMediaPath } from "@/modules/media/domain/storage-path";

export async function uploadProductMedia(
  establishmentId: string,
  productId: string,
  file: File,
  altText: string | undefined,
  requestId: string = crypto.randomUUID(),
) {
  const buffer = new Uint8Array(await file.arrayBuffer());
  const validation = validateMediaUpload(buffer, file.type);

  if (!validation.ok) {
    throw new AppError("VALIDATION_ERROR", { requestId, message: validation.reason });
  }

  const path = buildProductMediaPath(establishmentId, productId, validation.extension);
  const supabase = await createSupabaseServerClient();

  const { error: uploadError } = await supabase.storage
    .from("menu-media")
    .upload(path, buffer, { contentType: validation.mimeType, upsert: false });

  if (uploadError) {
    throw new AppError("INTERNAL_ERROR", { requestId, message: "Falha ao enviar o arquivo." });
  }

  const { count } = await supabase
    .from("product_media")
    .select("id", { count: "exact", head: true })
    .eq("product_id", productId);

  const { data, error } = await supabase
    .from("product_media")
    .insert({
      establishment_id: establishmentId,
      product_id: productId,
      kind: validation.kind,
      storage_path: path,
      alt_text: altText,
      mime_type: validation.mimeType,
      size_bytes: buffer.byteLength,
      is_primary: !count,
    })
    .select()
    .single();

  if (error) {
    await supabase.storage.from("menu-media").remove([path]);
    throw new AppError("VALIDATION_ERROR", { requestId, message: error.message });
  }

  return data;
}

export async function deleteProductMedia(mediaId: string, requestId: string = crypto.randomUUID()) {
  const supabase = await createSupabaseServerClient();

  const { data: media, error: findError } = await supabase
    .from("product_media")
    .select("storage_path")
    .eq("id", mediaId)
    .maybeSingle();

  if (findError || !media) {
    throw new AppError("NOT_FOUND", { requestId });
  }

  const { error: deleteError } = await supabase.from("product_media").delete().eq("id", mediaId);
  if (deleteError) {
    throw new AppError("VALIDATION_ERROR", { requestId, message: deleteError.message });
  }

  await supabase.storage.from("menu-media").remove([media.storage_path]);
}

export function getProductMediaPublicUrl(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  storagePath: string,
): string {
  return supabase.storage.from("menu-media").getPublicUrl(storagePath).data.publicUrl;
}
