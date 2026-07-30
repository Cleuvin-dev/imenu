import { z } from "zod";

export const optionGroupSchema = z
  .object({
    name: z.string().trim().min(1, "Informe o nome do grupo.").max(80),
    minSelect: z.coerce.number().int().min(0).default(0),
    maxSelect: z.coerce.number().int().min(1),
  })
  .refine((value) => value.maxSelect >= value.minSelect, {
    message: "O máximo de seleções não pode ser menor que o mínimo.",
    path: ["maxSelect"],
  });

export type OptionGroupInput = z.infer<typeof optionGroupSchema>;

export const optionSchema = z.object({
  optionGroupId: z.uuid(),
  name: z.string().trim().min(1, "Informe o nome do adicional.").max(120),
  priceDeltaCents: z.coerce.number().int().min(0, "O preço adicional não pode ser negativo.").default(0),
});

export type OptionInput = z.infer<typeof optionSchema>;
