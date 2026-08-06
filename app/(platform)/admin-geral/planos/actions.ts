"use server";

import { revalidatePath } from "next/cache";
import { AppError, type AppErrorFieldErrors } from "@/lib/errors/app-error";
import { createPlan } from "@/modules/billing/application/create-plan";
import { updatePlan } from "@/modules/billing/application/update-plan";

export type PlanFormActionState = {
  error?: string;
  fieldErrors?: AppErrorFieldErrors;
  success?: boolean;
};

function limitsFromFormData(formData: FormData) {
  return {
    maxProducts: formData.get("maxProducts") || undefined,
    maxTables: formData.get("maxTables") || undefined,
    maxMembers: formData.get("maxMembers") || undefined,
    maxMediaStorageMb: formData.get("maxMediaStorageMb") || undefined,
  };
}

export async function createPlanAction(
  _prevState: PlanFormActionState,
  formData: FormData,
): Promise<PlanFormActionState> {
  try {
    await createPlan({
      code: formData.get("code"),
      name: formData.get("name"),
      priceCents: formData.get("priceCents"),
      billingIntervalMonths: formData.get("billingIntervalMonths") || 1,
      isActive: formData.get("isActive") === "on",
      ...limitsFromFormData(formData),
    });
  } catch (err) {
    if (err instanceof AppError) {
      return { error: err.message, fieldErrors: err.fieldErrors };
    }
    return { error: "Não foi possível criar o plano." };
  }

  revalidatePath("/admin-geral/planos");
  return { success: true };
}

export async function updatePlanAction(planId: string, formData: FormData): Promise<void> {
  await updatePlan(planId, {
    name: formData.get("name"),
    priceCents: formData.get("priceCents"),
    billingIntervalMonths: formData.get("billingIntervalMonths") || 1,
    isActive: formData.get("isActive") === "on",
    ...limitsFromFormData(formData),
  });
  revalidatePath("/admin-geral/planos");
}
