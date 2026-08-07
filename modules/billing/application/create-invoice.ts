import "server-only";
import { AppError } from "@/lib/errors/app-error";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requirePlatformAdmin } from "@/lib/auth/platform";
import { createInvoiceSchema } from "@/modules/billing/schemas/create-invoice.schema";

/**
 * Cria fatura para um período (docs/03 RF-ADM-006, docs/09 §4). A RLS de
 * `invoices` desde a Fase 2 já permite insert para platform admin (com
 * `status <> 'paid'` garantido pelo próprio `with check`) — não precisa de
 * função nova.
 */
export async function createInvoice(
  establishmentId: string,
  input: unknown,
  requestId: string = crypto.randomUUID(),
): Promise<void> {
  await requirePlatformAdmin(["super_admin", "platform_admin"], requestId);

  const parsed = createInvoiceSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", { requestId, fieldErrors: parsed.error.flatten().fieldErrors });
  }

  const supabase = await createSupabaseServerClient();

  const { data: subscription, error: subscriptionError } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("establishment_id", establishmentId)
    .maybeSingle();

  if (subscriptionError) {
    throw new AppError("INTERNAL_ERROR", { requestId });
  }
  if (!subscription) {
    throw new AppError("NOT_FOUND", { requestId, message: "Este estabelecimento não tem assinatura cadastrada." });
  }

  const { error } = await supabase.from("invoices").insert({
    establishment_id: establishmentId,
    subscription_id: subscription.id,
    reference_period_start: parsed.data.referencePeriodStart,
    reference_period_end: parsed.data.referencePeriodEnd,
    amount_cents: parsed.data.amountCents,
    status: "open",
    issued_at: new Date().toISOString(),
    due_at: parsed.data.dueAt,
  });

  if (error) {
    if (error.code === "23505") {
      throw new AppError("VALIDATION_ERROR", {
        requestId,
        message: "Já existe uma fatura para este período.",
      });
    }
    throw new AppError("INTERNAL_ERROR", { requestId });
  }
}
