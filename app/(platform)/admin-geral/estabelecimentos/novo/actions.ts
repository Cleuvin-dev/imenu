"use server";

import { AppError } from "@/lib/errors/app-error";
import { createEstablishmentWithOwner } from "@/modules/platform-admin/application/create-establishment";

export type CreateEstablishmentActionState = {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  success?: {
    establishmentId: string;
    slug: string;
    temporaryPassword: string;
  };
};

export async function createEstablishmentAction(
  _prevState: CreateEstablishmentActionState,
  formData: FormData,
): Promise<CreateEstablishmentActionState> {
  try {
    const result = await createEstablishmentWithOwner({
      legalName: formData.get("legalName"),
      tradeName: formData.get("tradeName"),
      documentNumber: formData.get("documentNumber") || undefined,
      email: formData.get("email") || undefined,
      phone: formData.get("phone") || undefined,
      city: formData.get("city") || undefined,
      stateCode: formData.get("stateCode") || undefined,
      planId: formData.get("planId"),
      ownerDisplayName: formData.get("ownerDisplayName"),
      ownerEmail: formData.get("ownerEmail"),
    });

    return {
      success: {
        establishmentId: result.establishmentId,
        slug: result.slug,
        temporaryPassword: result.temporaryPassword,
      },
    };
  } catch (err) {
    if (err instanceof AppError) {
      return { error: err.message, fieldErrors: err.fieldErrors };
    }
    return { error: "Não foi possível cadastrar o estabelecimento." };
  }
}
