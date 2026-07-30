import { z } from "zod";

export const productSchema = z.object({
  categoryId: z.uuid("Selecione uma categoria."),
  name: z.string().trim().min(1, "Informe o nome do produto.").max(120),
  shortDescription: z.string().trim().max(240).optional(),
  description: z.string().trim().max(2000).optional(),
  ingredients: z.array(z.string().trim().min(1)).default([]),
  allergens: z.array(z.string().trim().min(1)).default([]),
  basePriceCents: z.coerce.number().int("Preço deve ser um número inteiro de centavos.").min(0, "Preço não pode ser negativo."),
});

export type ProductInput = z.infer<typeof productSchema>;
