import "server-only";
import { randomBytes } from "node:crypto";
import { AppError } from "@/lib/errors/app-error";
import { requirePlatformAdmin } from "@/lib/auth/platform";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createEstablishmentSchema } from "@/modules/platform-admin/schemas/create-establishment.schema";
import { slugify } from "@/modules/catalog/domain/slug";

async function generateUniqueEstablishmentSlug(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  tradeName: string,
): Promise<string> {
  const base = slugify(tradeName) || "estabelecimento";
  let candidate = base;
  let attempt = 1;

  while (attempt < 50) {
    const { data, error } = await admin.from("establishments").select("id").eq("slug", candidate).maybeSingle();
    if (error) break;
    if (!data) return candidate;
    attempt += 1;
    candidate = `${base}-${attempt}`;
  }
  return `${base}-${Date.now()}`;
}

export type CreatedEstablishment = {
  establishmentId: string;
  slug: string;
  /** Só existe nesta resposta — o admin precisa repassar ao proprietário por um canal seguro. */
  temporaryPassword: string;
};

/**
 * Cadastra estabelecimento + owner inicial (docs/03 RF-ADM-002). Usa o
 * cliente service role do início ao fim (a conta do owner precisa existir
 * em auth.users antes de qualquer insert em public) — exige
 * SUPABASE_SERVICE_ROLE_KEY; sem ela, createSupabaseAdminClient() lança um
 * erro claro antes de qualquer escrita (bloqueio documentado em
 * status/IMPLEMENTATION_STATUS.md). A autorização é toda feita aqui, antes
 * de tocar no cliente admin — mesmo padrão do cron de assinaturas.
 */
export async function createEstablishmentWithOwner(
  input: unknown,
  requestId: string = crypto.randomUUID(),
): Promise<CreatedEstablishment> {
  const actor = await requirePlatformAdmin(["super_admin", "platform_admin"], requestId);

  const parsed = createEstablishmentSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", { requestId, fieldErrors: parsed.error.flatten().fieldErrors });
  }

  const admin = createSupabaseAdminClient();
  const slug = await generateUniqueEstablishmentSlug(admin, parsed.data.tradeName);
  const temporaryPassword = randomBytes(12).toString("base64url");

  const { data: createdUser, error: createUserError } = await admin.auth.admin.createUser({
    email: parsed.data.ownerEmail,
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: { display_name: parsed.data.ownerDisplayName },
  });

  if (createUserError || !createdUser?.user) {
    throw new AppError("VALIDATION_ERROR", {
      requestId,
      message: createUserError?.message.toLowerCase().includes("already")
        ? "Já existe uma conta com este e-mail de proprietário."
        : "Não foi possível criar a conta do proprietário.",
    });
  }

  const { data, error } = await admin.rpc("platform_bootstrap_establishment", {
    p_owner_user_id: createdUser.user.id,
    p_actor_user_id: actor.userId,
    p_legal_name: parsed.data.legalName,
    p_trade_name: parsed.data.tradeName,
    p_slug: slug,
    p_document_number: parsed.data.documentNumber ?? "",
    p_email: parsed.data.email ?? "",
    p_phone: parsed.data.phone ?? "",
    p_city: parsed.data.city ?? "",
    p_state_code: parsed.data.stateCode ?? "",
    p_plan_id: parsed.data.planId,
  });

  if (error || !data) {
    // Compensa: remove o usuário recém-criado para não deixar uma conta órfã sem estabelecimento.
    await admin.auth.admin.deleteUser(createdUser.user.id);
    throw new AppError("VALIDATION_ERROR", {
      requestId,
      message: "Não foi possível concluir o cadastro do estabelecimento. Verifique o plano selecionado.",
    });
  }

  const result = data as unknown as { establishmentId: string; slug: string };

  await admin
    .from("establishments")
    .update({ owner_contact_name: parsed.data.ownerDisplayName })
    .eq("id", result.establishmentId);

  return { establishmentId: result.establishmentId, slug: result.slug, temporaryPassword };
}
