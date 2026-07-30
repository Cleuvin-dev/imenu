import { z } from "zod";

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Informe o nome da categoria.").max(80),
  description: z.string().trim().max(2000).optional(),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

export type CategoryInput = z.infer<typeof categorySchema>;
