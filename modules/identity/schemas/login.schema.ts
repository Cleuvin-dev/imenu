import { z } from "zod";

export const loginSchema = z.object({
  email: z.email({ message: "Informe um e-mail válido." }),
  password: z.string().min(8, "A senha deve ter ao menos 8 caracteres."),
});

export type LoginInput = z.infer<typeof loginSchema>;
