"use server";

import { revalidatePath } from "next/cache";
import { AppError } from "@/lib/errors/app-error";
import { resolveActiveEstablishment } from "@/modules/tenancy/application/resolve-active-establishment";
import { createInvite } from "@/modules/tenancy/application/create-invite";
import { revokeInvite } from "@/modules/tenancy/application/revoke-invite";
import { updateMember } from "@/modules/tenancy/application/update-member";
import { getPublicEnv } from "@/lib/env";

async function requireActiveEstablishmentId(): Promise<string> {
  const resolution = await resolveActiveEstablishment();
  if (resolution.status !== "active") {
    throw new AppError("FORBIDDEN", { requestId: crypto.randomUUID() });
  }
  return resolution.establishment.establishmentId;
}

export type CreateInviteActionState = {
  error?: string;
  inviteLink?: string;
  inviteEmail?: string;
};

export async function createInviteAction(
  _prevState: CreateInviteActionState,
  formData: FormData,
): Promise<CreateInviteActionState> {
  let establishmentId: string;
  try {
    establishmentId = await requireActiveEstablishmentId();
  } catch {
    return { error: "Sessão inválida. Atualize a página." };
  }

  try {
    const invite = await createInvite(establishmentId, {
      email: formData.get("email"),
      role: formData.get("role"),
    });
    const appUrl = getPublicEnv().NEXT_PUBLIC_APP_URL;
    revalidatePath("/painel/equipe");
    return {
      inviteLink: `${appUrl}/convite/${invite.rawToken}`,
      inviteEmail: invite.email,
    };
  } catch (err) {
    if (err instanceof AppError) {
      return { error: err.message };
    }
    return { error: "Não foi possível criar o convite." };
  }
}

export async function revokeInviteAction(inviteId: string): Promise<void> {
  const establishmentId = await requireActiveEstablishmentId();
  await revokeInvite(establishmentId, inviteId);
  revalidatePath("/painel/equipe");
}

export type UpdateMemberActionState = {
  error?: string;
};

export async function updateMemberRoleAction(memberId: string, formData: FormData): Promise<void> {
  const establishmentId = await requireActiveEstablishmentId();
  await updateMember(establishmentId, memberId, { role: formData.get("role") });
  revalidatePath("/painel/equipe");
}

export async function setMemberActiveAction(memberId: string, isActive: boolean): Promise<void> {
  const establishmentId = await requireActiveEstablishmentId();
  await updateMember(establishmentId, memberId, { isActive });
  revalidatePath("/painel/equipe");
}
