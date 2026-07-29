import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { ACTIVE_ESTABLISHMENT_COOKIE } from "@/lib/auth/tenant";
import {
  listUserEstablishments,
  type UserEstablishmentSummary,
} from "@/modules/tenancy/application/list-user-establishments";

export type ActiveEstablishmentResolution =
  | { status: "none" }
  | { status: "selection_required"; establishments: UserEstablishmentSummary[] }
  | {
      status: "active";
      establishment: UserEstablishmentSummary;
      establishments: UserEstablishmentSummary[];
    };

/**
 * Resolve o estabelecimento ativo do painel a partir do cookie de seleção,
 * revalidando sempre contra a associação real do usuário. Memoizado por
 * requisição (React cache) para que layout e página não consultem o banco
 * duas vezes. Quando há apenas um estabelecimento, ele é usado diretamente
 * sem exigir seleção manual (docs/02_PERSONAS_PAPEIS_E_PERMISSOES.md, §7).
 */
export const resolveActiveEstablishment = cache(async (): Promise<ActiveEstablishmentResolution> => {
  const establishments = await listUserEstablishments();
  if (establishments.length === 0) {
    return { status: "none" };
  }

  const cookieStore = await cookies();
  const activeId = cookieStore.get(ACTIVE_ESTABLISHMENT_COOKIE)?.value;
  const active =
    establishments.find((item) => item.establishmentId === activeId) ??
    (establishments.length === 1 ? establishments[0] : undefined);

  if (!active) {
    return { status: "selection_required", establishments };
  }

  return { status: "active", establishment: active, establishments };
});
