import { z } from "zod";

export const createEstablishmentSchema = z.object({
  legalName: z.string().trim().min(1, "Informe a razão social.").max(180),
  tradeName: z.string().trim().min(1, "Informe o nome fantasia.").max(180),
  documentNumber: z.string().trim().max(32).optional(),
  email: z.email({ message: "Informe um e-mail válido." }).optional(),
  phone: z.string().trim().max(32).optional(),
  city: z.string().trim().max(120).optional(),
  stateCode: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{2}$/, "Use a sigla do estado (2 letras).")
    .transform((value) => value.toUpperCase())
    .optional(),
  planId: z.uuid({ message: "Selecione um plano." }),
  ownerDisplayName: z.string().trim().min(1, "Informe o nome do proprietário.").max(120),
  ownerEmail: z.email({ message: "Informe um e-mail válido para o proprietário." }),
});

export type CreateEstablishmentInput = z.infer<typeof createEstablishmentSchema>;
