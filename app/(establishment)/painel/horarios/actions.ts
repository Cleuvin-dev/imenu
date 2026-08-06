"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTenantRole } from "@/lib/auth/tenant";
import { resolveActiveEstablishment } from "@/modules/tenancy/application/resolve-active-establishment";
import {
  upsertBusinessHour,
  upsertBusinessHourException,
  deleteBusinessHourException,
  setAcceptingOrders,
} from "@/modules/catalog/application/business-hours";

const HOURS_MANAGE_ROLES = ["owner", "manager"] as const;

async function requireActiveEstablishmentId(): Promise<string> {
  const resolution = await resolveActiveEstablishment();
  if (resolution.status !== "active") {
    redirect("/painel");
  }
  await requireTenantRole(resolution.establishment.establishmentId, HOURS_MANAGE_ROLES);
  return resolution.establishment.establishmentId;
}

export async function upsertBusinessHourAction(weekday: number, formData: FormData): Promise<void> {
  const establishmentId = await requireActiveEstablishmentId();
  const isClosed = formData.get("isClosed") === "on";
  await upsertBusinessHour(establishmentId, {
    weekday,
    isClosed,
    opensAt: isClosed ? null : String(formData.get("opensAt") || ""),
    closesAt: isClosed ? null : String(formData.get("closesAt") || ""),
  });
  revalidatePath("/painel/horarios");
}

export async function upsertBusinessHourExceptionAction(formData: FormData): Promise<void> {
  const establishmentId = await requireActiveEstablishmentId();
  const isClosed = formData.get("isClosed") === "on";
  await upsertBusinessHourException(establishmentId, {
    date: formData.get("date"),
    isClosed,
    opensAt: isClosed ? null : String(formData.get("opensAt") || ""),
    closesAt: isClosed ? null : String(formData.get("closesAt") || ""),
    note: formData.get("note") || undefined,
  });
  revalidatePath("/painel/horarios");
}

export async function deleteBusinessHourExceptionAction(exceptionId: string): Promise<void> {
  const establishmentId = await requireActiveEstablishmentId();
  await deleteBusinessHourException(establishmentId, exceptionId);
  revalidatePath("/painel/horarios");
}

export async function setAcceptingOrdersAction(acceptingOrders: boolean): Promise<void> {
  const establishmentId = await requireActiveEstablishmentId();
  await setAcceptingOrders(establishmentId, acceptingOrders);
  revalidatePath("/painel/horarios");
}
