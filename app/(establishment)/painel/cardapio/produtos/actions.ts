"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTenantRole } from "@/lib/auth/tenant";
import { resolveActiveEstablishment } from "@/modules/tenancy/application/resolve-active-establishment";
import { createProduct, archiveProduct, publishProduct, setProductAvailability } from "@/modules/catalog/application/products";

const MENU_ROLES = ["owner", "manager", "menu_editor"] as const;
const AVAILABILITY_ROLES = ["owner", "manager", "menu_editor", "kitchen", "cashier"] as const;

async function requireActiveEstablishmentId(
  allowedRoles: readonly ["owner", "manager", "menu_editor"] | readonly ["owner", "manager", "menu_editor", "kitchen", "cashier"],
): Promise<string> {
  const resolution = await resolveActiveEstablishment();
  if (resolution.status !== "active") {
    redirect("/painel");
  }
  await requireTenantRole(resolution.establishment.establishmentId, allowedRoles);
  return resolution.establishment.establishmentId;
}

export async function createProductAction(formData: FormData): Promise<void> {
  const establishmentId = await requireActiveEstablishmentId(MENU_ROLES);

  const product = await createProduct(establishmentId, {
    categoryId: formData.get("categoryId"),
    name: formData.get("name"),
    shortDescription: formData.get("shortDescription") || undefined,
    basePriceCents: formData.get("basePriceCents"),
  });

  revalidatePath("/painel/cardapio/produtos");
  redirect(`/painel/cardapio/produtos/${product.id}`);
}

export async function archiveProductAction(productId: string): Promise<void> {
  await requireActiveEstablishmentId(MENU_ROLES);
  await archiveProduct(productId);
  revalidatePath("/painel/cardapio/produtos");
}

export async function publishProductAction(productId: string): Promise<{ error?: string }> {
  await requireActiveEstablishmentId(MENU_ROLES);
  try {
    await publishProduct(productId);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Não foi possível publicar o produto." };
  }
  revalidatePath("/painel/cardapio/produtos");
  return {};
}

export async function setProductAvailabilityAction(productId: string, isAvailable: boolean): Promise<void> {
  await requireActiveEstablishmentId(AVAILABILITY_ROLES);
  await setProductAvailability(productId, isAvailable);
  revalidatePath("/painel/cardapio/produtos");
}
