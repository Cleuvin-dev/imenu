"use server";

import { revalidatePath } from "next/cache";
import { AppError, type AppErrorFieldErrors } from "@/lib/errors/app-error";
import { confirmInvoicePayment } from "@/modules/billing/application/confirm-invoice-payment";
import { updateEstablishment } from "@/modules/platform-admin/application/update-establishment";

export type ConfirmPaymentActionState = {
  error?: string;
};

export type UpdateEstablishmentActionState = {
  error?: string;
  fieldErrors?: AppErrorFieldErrors;
};

export async function updateEstablishmentAction(
  establishmentId: string,
  _prevState: UpdateEstablishmentActionState,
  formData: FormData,
): Promise<UpdateEstablishmentActionState> {
  try {
    await updateEstablishment(establishmentId, {
      legalName: formData.get("legalName"),
      tradeName: formData.get("tradeName"),
      documentNumber: formData.get("documentNumber") || undefined,
      email: formData.get("email") || undefined,
      phone: formData.get("phone") || undefined,
      city: formData.get("city") || undefined,
      stateCode: formData.get("stateCode") || undefined,
      isActive: formData.get("isActive") === "on",
    });
  } catch (err) {
    if (err instanceof AppError) {
      return { error: err.message, fieldErrors: err.fieldErrors };
    }
    return { error: "Não foi possível salvar o cadastro." };
  }

  revalidatePath(`/admin-geral/estabelecimentos/${establishmentId}`);
  revalidatePath("/admin-geral/estabelecimentos");
  return {};
}

export async function confirmPaymentAction(
  establishmentId: string,
  _prevState: ConfirmPaymentActionState,
  formData: FormData,
): Promise<ConfirmPaymentActionState> {
  try {
    await confirmInvoicePayment({
      invoiceId: formData.get("invoiceId"),
      amountCents: Number(formData.get("amountCents")),
      paidAt: formData.get("paidAt"),
      method: formData.get("method"),
      reference: formData.get("reference") || undefined,
      note: formData.get("note") || undefined,
    });
  } catch (err) {
    if (err instanceof AppError) {
      return { error: err.message };
    }
    return { error: "Não foi possível confirmar o pagamento." };
  }

  revalidatePath(`/admin-geral/estabelecimentos/${establishmentId}`);
  return {};
}
