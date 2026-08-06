import { z } from "zod";

export const signUpSchema = z.object({
  email: z.email({ message: "Informe um e-mail válido." }),
  password: z.string().min(8, "A senha deve ter ao menos 8 caracteres."),
  displayName: z.string().trim().min(1, "Informe seu nome.").max(120, "Nome muito longo."),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
