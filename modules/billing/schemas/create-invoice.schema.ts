import { z } from "zod";

export const createInvoiceSchema = z
  .object({
    referencePeriodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use o formato AAAA-MM-DD."),
    referencePeriodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use o formato AAAA-MM-DD."),
    amountCents: z.coerce.number().int("Valor deve ser um número inteiro de centavos.").min(0, "Valor não pode ser negativo."),
    dueAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use o formato AAAA-MM-DD."),
  })
  .refine((data) => data.referencePeriodEnd >= data.referencePeriodStart, {
    message: "O fim do período não pode ser antes do início.",
    path: ["referencePeriodEnd"],
  });

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
