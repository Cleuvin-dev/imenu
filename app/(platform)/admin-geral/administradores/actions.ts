"use server";

import { revalidatePath } from "next/cache";
import { AppError, type AppErrorFieldErrors } from "@/lib/errors/app-error";
import { addPlatformAdmin } from "@/modules/platform-admin/application/add-admin";
import { updatePlatformAdmin } from "@/modules/platform-admin/application/update-admin";
import { resetPlatformAdminPassword } from "@/modules/platform-admin/application/reset-admin-password";
import { deletePlatformAdmin } from "@/modules/platform-admin/application/delete-admin";

export type AddAdminActionState = {
  error?: string;
  fieldErrors?: AppErrorFieldErrors;
  success?: {
    temporaryPassword?: string;
  };
};

export async function addAdminAction(
  _prevState: AddAdminActionState,
  formData: FormData,
): Promise<AddAdminActionState> {
  try {
    const result = await addPlatformAdmin({
      displayName: formData.get("displayName"),
      email: formData.get("email"),
      role: formData.get("role"),
    });

    revalidatePath("/admin-geral/administradores");
    return { success: { temporaryPassword: result.temporaryPassword } };
  } catch (err) {
    if (err instanceof AppError) {
      return { error: err.message, fieldErrors: err.fieldErrors };
    }
    return { error: "Não foi possível adicionar o administrador." };
  }
}

export async function updateAdminRoleAction(userId: string, formData: FormData): Promise<void> {
  await updatePlatformAdmin(userId, { role: formData.get("role") });
  revalidatePath("/admin-geral/administradores");
}

export async function setAdminActiveAction(userId: string, isActive: boolean): Promise<void> {
  await updatePlatformAdmin(userId, { isActive });
  revalidatePath("/admin-geral/administradores");
}

export type ResetPasswordActionState = {
  error?: string;
  temporaryPassword?: string;
};

export async function resetAdminPasswordAction(
  userId: string,
  _prevState: ResetPasswordActionState,
): Promise<ResetPasswordActionState> {
  try {
    const result = await resetPlatformAdminPassword(userId);
    return { temporaryPassword: result.temporaryPassword };
  } catch (err) {
    if (err instanceof AppError) {
      return { error: err.message };
    }
    return { error: "Não foi possível redefinir a senha." };
  }
}

export type DeleteAdminActionState = {
  error?: string;
};

export async function deleteAdminAction(userId: string, _prevState: DeleteAdminActionState): Promise<DeleteAdminActionState> {
  try {
    await deletePlatformAdmin(userId);
  } catch (err) {
    if (err instanceof AppError) {
      return { error: err.message };
    }
    return { error: "Não foi possível remover o administrador." };
  }

  revalidatePath("/admin-geral/administradores");
  return {};
}
