"use server";

import { revalidatePath } from "next/cache";
import { AppError } from "@/lib/errors/app-error";
import { confirmInvoicePayment } from "@/modules/billing/application/confirm-invoice-payment";

export type ConfirmPaymentActionState = {
  error?: string;
};

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
