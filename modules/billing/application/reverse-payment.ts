import "server-only";
import { AppError } from "@/lib/errors/app-error";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { reversePaymentSchema } from "@/modules/billing/schemas/reverse-payment.schema";

export async function reversePayment(input: unknown, requestId: string = crypto.randomUUID()) {
  const parsed = reversePaymentSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", {
      requestId,
      fieldErrors: parsed.error.flatten().fieldErrors,
    });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("reverse_payment", {
    p_payment_id: parsed.data.paymentId,
    p_reason: parsed.data.reason,
  });

  if (error) {
    throw new AppError("VALIDATION_ERROR", { requestId, message: error.message });
  }

  return data;
}
