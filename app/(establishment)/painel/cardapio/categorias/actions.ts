"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTenantRole } from "@/lib/auth/tenant";
import { resolveActiveEstablishment } from "@/modules/tenancy/application/resolve-active-establishment";
import { createCategory, updateCategory, setCategoryActive } from "@/modules/catalog/application/categories";

const MENU_ROLES = ["owner", "manager", "menu_editor"] as const;

async function requireActiveMenuEditorEstablishmentId(): Promise<string> {
  const resolution = await resolveActiveEstablishment();
  if (resolution.status !== "active") {
    redirect("/painel");
  }
  await requireTenantRole(resolution.establishment.establishmentId, MENU_ROLES);
  return resolution.establishment.establishmentId;
}

export async function createCategoryAction(formData: FormData): Promise<void> {
  const establishmentId = await requireActiveMenuEditorEstablishmentId();

  await createCategory(establishmentId, {
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    sortOrder: formData.get("sortOrder") || 0,
  });

  revalidatePath("/painel/cardapio/categorias");
}

export async function updateCategoryAction(categoryId: string, formData: FormData): Promise<void> {
  await requireActiveMenuEditorEstablishmentId();

  await updateCategory(categoryId, {
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    sortOrder: formData.get("sortOrder") || 0,
  });

  revalidatePath("/painel/cardapio/categorias");
}

export async function setCategoryActiveAction(categoryId: string, isActive: boolean): Promise<void> {
  await requireActiveMenuEditorEstablishmentId();
  await setCategoryActive(categoryId, isActive);
  revalidatePath("/painel/cardapio/categorias");
}
