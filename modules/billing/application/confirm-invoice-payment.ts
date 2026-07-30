import "server-only";
import { AppError } from "@/lib/errors/app-error";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { confirmInvoicePaymentSchema } from "@/modules/billing/schemas/confirm-payment.schema";

/**
 * Chama confirm_invoice_payment via RPC usando o cliente autenticado do
 * próprio admin (nunca o cliente service role) — a função valida no banco,
 * via auth.uid(), que o chamador é um platform admin ativo. Aceita entrada
 * não confiável (ex.: FormData bruto); a validação Zod é a fronteira.
 */
export async function confirmInvoicePayment(input: unknown, requestId: string = crypto.randomUUID()) {
  const parsed = confirmInvoicePaymentSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", {
      requestId,
      fieldErrors: parsed.error.flatten().fieldErrors,
    });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("confirm_invoice_payment", {
    p_invoice_id: parsed.data.invoiceId,
    p_amount_cents: parsed.data.amountCents,
    p_paid_at: parsed.data.paidAt.toISOString(),
    p_method: parsed.data.method,
    p_reference: parsed.data.reference,
    p_note: parsed.data.note,
  });

  if (error) {
    throw new AppError("VALIDATION_ERROR", { requestId, message: error.message });
  }

  return data;
}
