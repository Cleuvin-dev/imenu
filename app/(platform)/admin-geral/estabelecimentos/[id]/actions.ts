"use server";

import { revalidatePath } from "next/cache";
import { AppError, type AppErrorFieldErrors } from "@/lib/errors/app-error";
import { confirmInvoicePayment } from "@/modules/billing/application/confirm-invoice-payment";
import { createInvoice } from "@/modules/billing/application/create-invoice";
import { updateEstablishment } from "@/modules/platform-admin/application/update-establishment";
import { suspendEstablishment, reactivateEstablishment } from "@/modules/platform-admin/application/suspend-establishment";
import { resetEstablishmentMemberPassword } from "@/modules/platform-admin/application/reset-member-password";

export type ConfirmPaymentActionState = {
  error?: string;
};

export type CreateInvoiceActionState = {
  error?: string;
  fieldErrors?: AppErrorFieldErrors;
};

export async function createInvoiceAction(
  establishmentId: string,
  _prevState: CreateInvoiceActionState,
  formData: FormData,
): Promise<CreateInvoiceActionState> {
  try {
    await createInvoice(establishmentId, {
      referencePeriodStart: formData.get("referencePeriodStart"),
      referencePeriodEnd: formData.get("referencePeriodEnd"),
      amountCents: formData.get("amountCents"),
      dueAt: formData.get("dueAt"),
    });
  } catch (err) {
    if (err instanceof AppError) {
      return { error: err.message, fieldErrors: err.fieldErrors };
    }
    return { error: "Não foi possível criar a fatura." };
  }

  revalidatePath(`/admin-geral/estabelecimentos/${establishmentId}`);
  return {};
}

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

export type SuspendEstablishmentActionState = {
  error?: string;
  fieldErrors?: AppErrorFieldErrors;
};

export async function suspendEstablishmentAction(
  establishmentId: string,
  _prevState: SuspendEstablishmentActionState,
  formData: FormData,
): Promise<SuspendEstablishmentActionState> {
  try {
    await suspendEstablishment(establishmentId, { reason: formData.get("reason") });
  } catch (err) {
    if (err instanceof AppError) {
      return { error: err.message, fieldErrors: err.fieldErrors };
    }
    return { error: "Não foi possível suspender o estabelecimento." };
  }

  revalidatePath(`/admin-geral/estabelecimentos/${establishmentId}`);
  revalidatePath("/admin-geral/estabelecimentos");
  return {};
}

export type ReactivateEstablishmentActionState = {
  error?: string;
};

export async function reactivateEstablishmentAction(
  establishmentId: string,
  _prevState: ReactivateEstablishmentActionState,
): Promise<ReactivateEstablishmentActionState> {
  try {
    await reactivateEstablishment(establishmentId);
  } catch (err) {
    if (err instanceof AppError) {
      return { error: err.message };
    }
    return { error: "Não foi possível reativar o estabelecimento." };
  }

  revalidatePath(`/admin-geral/estabelecimentos/${establishmentId}`);
  revalidatePath("/admin-geral/estabelecimentos");
  return {};
}

export type ResetMemberPasswordActionState = {
  error?: string;
  temporaryPassword?: string;
};

export async function resetMemberPasswordAction(
  establishmentId: string,
  userId: string,
  _prevState: ResetMemberPasswordActionState,
): Promise<ResetMemberPasswordActionState> {
  try {
    const result = await resetEstablishmentMemberPassword(establishmentId, userId);
    return { temporaryPassword: result.temporaryPassword };
  } catch (err) {
    if (err instanceof AppError) {
      return { error: err.message };
    }
    return { error: "Não foi possível redefinir a senha." };
  }
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
