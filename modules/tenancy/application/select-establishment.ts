import "server-only";
import { cookies } from "next/headers";
import { AppError } from "@/lib/errors/app-error";
import { requireTenantMembership, ACTIVE_ESTABLISHMENT_COOKIE } from "@/lib/auth/tenant";
import {
  selectEstablishmentSchema,
  type SelectEstablishmentInput,
} from "@/modules/tenancy/schemas/select-establishment.schema";

/**
 * Define o tenant ativo do painel após revalidar, no servidor, que o usuário
 * é membro ativo do estabelecimento escolhido — nunca aceita o id apenas
 * porque veio do formulário/cliente.
 */
export async function selectEstablishment(
  input: SelectEstablishmentInput,
  requestId: string = crypto.randomUUID(),
): Promise<void> {
  const parsed = selectEstablishmentSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", {
      requestId,
      fieldErrors: parsed.error.flatten().fieldErrors,
    });
  }

  await requireTenantMembership(parsed.data.establishmentId, requestId);

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ESTABLISHMENT_COOKIE, parsed.data.establishmentId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
}
