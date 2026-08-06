import { z } from "zod";

export const createInviteSchema = z.object({
  email: z.email({ message: "Informe um e-mail válido." }),
  role: z.enum(["owner", "manager", "menu_editor", "kitchen", "cashier", "viewer"]),
});

export type CreateInviteInput = z.infer<typeof createInviteSchema>;
