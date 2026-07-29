"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ACTIVE_ESTABLISHMENT_COOKIE } from "@/lib/auth/tenant";
import { selectEstablishment } from "@/modules/tenancy/application/select-establishment";
import { signOut } from "@/modules/identity/application/sign-in";

export async function selectEstablishmentAction(formData: FormData): Promise<void> {
  const establishmentId = String(formData.get("establishmentId") ?? "");
  await selectEstablishment({ establishmentId });
  redirect("/painel");
}

export async function clearActiveEstablishmentAction(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ACTIVE_ESTABLISHMENT_COOKIE);
  redirect("/painel");
}

export async function signOutAction(): Promise<void> {
  await signOut();
  redirect("/entrar");
}
