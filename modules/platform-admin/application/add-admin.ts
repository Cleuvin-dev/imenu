import "server-only";
import { randomBytes } from "node:crypto";
import { AppError } from "@/lib/errors/app-error";
import { requirePlatformAdmin } from "@/lib/auth/platform";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { addAdminSchema } from "@/modules/platform-admin/schemas/add-admin.schema";

export type AddedPlatformAdmin = {
  /** Só existe quando uma conta nova foi criada — repassar ao funcionário por canal seguro. */
  temporaryPassword?: string;
};

/**
 * Concede papel de administrador da plataforma (docs/03 RF-ADM-014). Se já
 * existir uma conta com o e-mail informado (por já ter feito login antes,
 * ou por ser owner de algum estabelecimento), apenas grava o papel. Caso
 * contrário, cria a conta agora mesmo (mesmo padrão de
 * createEstablishmentWithOwner) com senha temporária, para dar acesso a um
 * funcionário recém-contratado sem exigir auto-cadastro público.
 */
export async function addPlatformAdmin(
  input: unknown,
  requestId: string = crypto.randomUUID(),
): Promise<AddedPlatformAdmin> {
  const actor = await requirePlatformAdmin(["super_admin"], requestId);

  const parsed = addAdminSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", { requestId, fieldErrors: parsed.error.flatten().fieldErrors });
  }

  const admin = createSupabaseAdminClient();

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id")
    .eq("email", parsed.data.email)
    .maybeSingle();

  if (profileError) {
    throw new AppError("INTERNAL_ERROR", { requestId });
  }

  let userId: string;
  let temporaryPassword: string | undefined;

  if (profile) {
    userId = profile.id;
  } else {
    temporaryPassword = randomBytes(12).toString("base64url");

    const { data: createdUser, error: createUserError } = await admin.auth.admin.createUser({
      email: parsed.data.email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: { display_name: parsed.data.displayName },
    });

    if (createUserError || !createdUser?.user) {
      throw new AppError("VALIDATION_ERROR", {
        requestId,
        message: createUserError?.message.toLowerCase().includes("already")
          ? "Já existe uma conta com este e-mail."
          : "Não foi possível criar a conta do administrador.",
      });
    }

    userId = createdUser.user.id;
  }

  const { error } = await admin.rpc("platform_grant_admin_role", {
    p_user_id: userId,
    p_actor_user_id: actor.userId,
    p_role: parsed.data.role,
  });

  if (error) {
    if (temporaryPassword) {
      // Compensa: remove a conta recém-criada para não deixar usuário órfão sem papel de admin.
      await admin.auth.admin.deleteUser(userId);
    }
    throw new AppError("INTERNAL_ERROR", { requestId });
  }

  return { temporaryPassword };
}
