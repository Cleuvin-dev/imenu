import { z } from "zod";

export const reversePaymentSchema = z.object({
  paymentId: z.uuid(),
  reason: z.string().min(3, "Informe o motivo do estorno.").max(500),
});

export type ReversePaymentInput = z.infer<typeof reversePaymentSchema>;
