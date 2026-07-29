import { z } from "zod";

export const selectEstablishmentSchema = z.object({
  establishmentId: z.uuid({ message: "Estabelecimento inválido." }),
});

export type SelectEstablishmentInput = z.infer<typeof selectEstablishmentSchema>;
