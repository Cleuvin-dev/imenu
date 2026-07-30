"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTenantRole } from "@/lib/auth/tenant";
import { resolveActiveEstablishment } from "@/modules/tenancy/application/resolve-active-establishment";
import { createTable, updateTable, setTableActive, regenerateTableToken } from "@/modules/tables/application/tables";

const TABLE_MANAGE_ROLES = ["owner", "manager"] as const;

async function requireActiveEstablishmentId(): Promise<string> {
  const resolution = await resolveActiveEstablishment();
  if (resolution.status !== "active") {
    redirect("/painel");
  }
  await requireTenantRole(resolution.establishment.establishmentId, TABLE_MANAGE_ROLES);
  return resolution.establishment.establishmentId;
}

export async function createTableAction(formData: FormData): Promise<void> {
  const establishmentId = await requireActiveEstablishmentId();
  await createTable(establishmentId, {
    name: formData.get("name"),
    sortOrder: formData.get("sortOrder") || 0,
  });
  revalidatePath("/painel/mesas");
}

export async function updateTableAction(tableId: string, formData: FormData): Promise<void> {
  await requireActiveEstablishmentId();
  await updateTable(tableId, {
    name: formData.get("name"),
    sortOrder: formData.get("sortOrder") || 0,
  });
  revalidatePath("/painel/mesas");
}

export async function setTableActiveAction(tableId: string, isActive: boolean): Promise<void> {
  await requireActiveEstablishmentId();
  await setTableActive(tableId, isActive);
  revalidatePath("/painel/mesas");
}

export async function regenerateTableTokenAction(tableId: string): Promise<void> {
  await requireActiveEstablishmentId();
  await regenerateTableToken(tableId);
  revalidatePath("/painel/mesas");
}
