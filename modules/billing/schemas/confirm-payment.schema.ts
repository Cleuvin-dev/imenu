import { z } from "zod";

export const paymentMethodValues = ["pix", "boleto", "transfer", "cash", "card", "other"] as const;

export const confirmInvoicePaymentSchema = z.object({
  invoiceId: z.uuid(),
  amountCents: z.number().int().positive(),
  paidAt: z.coerce.date(),
  method: z.enum(paymentMethodValues),
  reference: z.string().max(200).optional(),
  note: z.string().max(1000).optional(),
});

export type ConfirmInvoicePaymentInput = z.infer<typeof confirmInvoicePaymentSchema>;
