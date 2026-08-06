import { z } from "zod";
import { optionalFromEmpty } from "@/lib/validation/empty-to-undefined";

export const updateEstablishmentSchema = z.object({
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
  isActive: z.boolean(),
});

export type UpdateEstablishmentInput = z.infer<typeof updateEstablishmentSchema>;

export const establishmentFiltersSchema = z.object({
  q: optionalFromEmpty(z.string().trim().max(160)),
  status: optionalFromEmpty(z.enum(["trialing", "active", "past_due", "suspended", "canceled"])),
  planId: optionalFromEmpty(z.uuid()),
});

export type EstablishmentFilters = z.infer<typeof establishmentFiltersSchema>;
