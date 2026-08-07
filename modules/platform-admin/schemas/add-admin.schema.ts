import { z } from "zod";

export const addAdminSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, { message: "Informe o nome completo." })
    .max(120, { message: "Nome muito longo." }),
  email: z.email({ message: "Informe um e-mail válido." }),
  role: z.enum(["super_admin", "platform_admin", "platform_support"]),
});

export type AddAdminInput = z.infer<typeof addAdminSchema>;

export const updateAdminSchema = z.object({
  role: z.enum(["super_admin", "platform_admin", "platform_support"]).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateAdminInput = z.infer<typeof updateAdminSchema>;
