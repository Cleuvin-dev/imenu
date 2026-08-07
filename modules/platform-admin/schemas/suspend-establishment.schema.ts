import { z } from "zod";

export const suspendEstablishmentSchema = z.object({
  reason: z.enum(["manual", "fraud", "contract_end", "other"], {
    message: "Selecione um motivo.",
  }),
});

export type SuspendEstablishmentInput = z.infer<typeof suspendEstablishmentSchema>;
