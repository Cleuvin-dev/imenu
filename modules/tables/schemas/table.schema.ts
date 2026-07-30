import { z } from "zod";

export const tableSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome/número da mesa.").max(60),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

export type TableInput = z.infer<typeof tableSchema>;
