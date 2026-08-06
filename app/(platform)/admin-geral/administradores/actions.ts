"use server";

import { revalidatePath } from "next/cache";
import { AppError, type AppErrorFieldErrors } from "@/lib/errors/app-error";
import { addPlatformAdmin } from "@/modules/platform-admin/application/add-admin";
import { updatePlatformAdmin } from "@/modules/platform-admin/application/update-admin";

export type AddAdminActionState = {
  error?: string;
  fieldErrors?: AppErrorFieldErrors;
};

export async function addAdminAction(
  _prevState: AddAdminActionState,
  formData: FormData,
): Promise<AddAdminActionState> {
  try {
    await addPlatformAdmin({
      email: formData.get("email"),
      role: formData.get("role"),
    });
  } catch (err) {
    if (err instanceof AppError) {
      return { error: err.message, fieldErrors: err.fieldErrors };
    }
    return { error: "Não foi possível adicionar o administrador." };
  }

  revalidatePath("/admin-geral/administradores");
  return {};
}

export async function updateAdminRoleAction(userId: string, formData: FormData): Promise<void> {
  await updatePlatformAdmin(userId, { role: formData.get("role") });
  revalidatePath("/admin-geral/administradores");
}

export async function setAdminActiveAction(userId: string, isActive: boolean): Promise<void> {
  await updatePlatformAdmin(userId, { isActive });
  revalidatePath("/admin-geral/administradores");
}
