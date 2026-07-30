"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTenantRole } from "@/lib/auth/tenant";
import { resolveActiveEstablishment } from "@/modules/tenancy/application/resolve-active-establishment";
import { updateProduct, archiveProduct, publishProduct, setProductAvailability } from "@/modules/catalog/application/products";
import {
  uploadProductMedia,
  deleteProductMedia,
} from "@/modules/media/application/upload-product-media";
import {
  createOptionGroup,
  createOption,
  attachOptionGroupToProduct,
  detachOptionGroupFromProduct,
} from "@/modules/catalog/application/options";
import { AppError } from "@/lib/errors/app-error";

const MENU_ROLES = ["owner", "manager", "menu_editor"] as const;

async function requireActiveEstablishmentId(): Promise<string> {
  const resolution = await resolveActiveEstablishment();
  if (resolution.status !== "active") {
    redirect("/painel");
  }
  await requireTenantRole(resolution.establishment.establishmentId, MENU_ROLES);
  return resolution.establishment.establishmentId;
}

function splitList(value: FormDataEntryValue | null): string[] {
  if (typeof value !== "string" || value.trim().length === 0) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export async function updateProductAction(productId: string, formData: FormData): Promise<void> {
  await requireActiveEstablishmentId();

  await updateProduct(productId, {
    categoryId: formData.get("categoryId"),
    name: formData.get("name"),
    shortDescription: formData.get("shortDescription") || undefined,
    description: formData.get("description") || undefined,
    ingredients: splitList(formData.get("ingredients")),
    allergens: splitList(formData.get("allergens")),
    basePriceCents: formData.get("basePriceCents"),
  });

  revalidatePath(`/painel/cardapio/produtos/${productId}`);
}

export async function publishProductDetailAction(
  productId: string,
  _prevState: { error?: string },
  _formData: FormData,
): Promise<{ error?: string }> {
  await requireActiveEstablishmentId();
  try {
    await publishProduct(productId);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Não foi possível publicar o produto." };
  }
  revalidatePath(`/painel/cardapio/produtos/${productId}`);
  return {};
}

export async function archiveProductDetailAction(productId: string): Promise<void> {
  await requireActiveEstablishmentId();
  await archiveProduct(productId);
  revalidatePath(`/painel/cardapio/produtos/${productId}`);
}

export async function setProductAvailabilityDetailAction(productId: string, isAvailable: boolean): Promise<void> {
  await requireActiveEstablishmentId();
  await setProductAvailability(productId, isAvailable);
  revalidatePath(`/painel/cardapio/produtos/${productId}`);
}

export async function uploadProductMediaAction(
  productId: string,
  _prevState: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  const establishmentId = await requireActiveEstablishmentId();
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecione um arquivo." };
  }

  try {
    await uploadProductMedia(establishmentId, productId, file, formData.get("altText")?.toString() || undefined);
  } catch (err) {
    if (err instanceof AppError) {
      return { error: err.message };
    }
    return { error: "Não foi possível enviar o arquivo." };
  }

  revalidatePath(`/painel/cardapio/produtos/${productId}`);
  return {};
}

export async function deleteProductMediaAction(productId: string, mediaId: string): Promise<void> {
  await requireActiveEstablishmentId();
  await deleteProductMedia(mediaId);
  revalidatePath(`/painel/cardapio/produtos/${productId}`);
}

export async function createOptionGroupAction(formData: FormData): Promise<void> {
  const establishmentId = await requireActiveEstablishmentId();

  await createOptionGroup(establishmentId, {
    name: formData.get("name"),
    minSelect: formData.get("minSelect") || 0,
    maxSelect: formData.get("maxSelect"),
  });

  revalidatePath("/painel/cardapio/produtos");
}

export async function createOptionAction(optionGroupId: string, formData: FormData): Promise<void> {
  const establishmentId = await requireActiveEstablishmentId();

  await createOption(establishmentId, {
    optionGroupId,
    name: formData.get("name"),
    priceDeltaCents: formData.get("priceDeltaCents") || 0,
  });

  revalidatePath("/painel/cardapio/produtos");
}

export async function attachOptionGroupAction(productId: string, optionGroupId: string): Promise<void> {
  const establishmentId = await requireActiveEstablishmentId();
  await attachOptionGroupToProduct(establishmentId, productId, optionGroupId);
  revalidatePath(`/painel/cardapio/produtos/${productId}`);
}

export async function detachOptionGroupAction(productId: string, optionGroupId: string): Promise<void> {
  await requireActiveEstablishmentId();
  await detachOptionGroupFromProduct(productId, optionGroupId);
  revalidatePath(`/painel/cardapio/produtos/${productId}`);
}
