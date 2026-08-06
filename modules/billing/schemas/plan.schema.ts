import { z } from "zod";

const PLAN_CODE_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const createPlanSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Informe um código.")
    .max(60)
    .regex(PLAN_CODE_PATTERN, "Use letras minúsculas, números e hífen."),
  name: z.string().trim().min(1, "Informe o nome do plano.").max(120),
  priceCents: z.coerce.number().int("Preço deve ser um número inteiro de centavos.").min(0, "Preço não pode ser negativo."),
  billingIntervalMonths: z.coerce
    .number()
    .int()
    .min(1, "Periodicidade mínima de 1 mês.")
    .max(24, "Periodicidade máxima de 24 meses."),
  maxProducts: z.coerce.number().int().min(0).optional(),
  maxTables: z.coerce.number().int().min(0).optional(),
  maxMembers: z.coerce.number().int().min(0).optional(),
  maxMediaStorageMb: z.coerce.number().int().min(0).optional(),
  isActive: z.boolean().default(true),
});

export type CreatePlanInput = z.infer<typeof createPlanSchema>;

/** Código nunca muda após criado (identidade estável do plano). */
export const updatePlanSchema = createPlanSchema.omit({ code: true });

export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;
