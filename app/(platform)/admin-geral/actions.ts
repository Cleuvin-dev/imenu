"use server";

import { redirect } from "next/navigation";
import { signOut } from "@/modules/identity/application/sign-in";

export async function signOutAction(): Promise<void> {
  await signOut();
  redirect("/entrar");
}
