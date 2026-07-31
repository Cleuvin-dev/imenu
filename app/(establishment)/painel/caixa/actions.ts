"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AppError } from "@/lib/errors/app-error";
import { requireTenantRole } from "@/lib/auth/tenant";
import { resolveActiveEstablishment } from "@/modules/tenancy/application/resolve-active-establishment";
import { listCaixaBoard } from "@/modules/service-session/application/list-caixa-board";
import { transitionBillRequest } from "@/modules/service-session/application/transition-bill-request";
import { closeTableSession } from "@/modules/service-session/application/close-table-session";
import type { Database } from "@/lib/supabase/database-types";

type BillRequestStatus = Database["public"]["Enums"]["bill_request_status"];

// docs/02 §3: "Solicitações de conta" — kitchen/viewer têm só leitura, menu_editor não tem acesso nenhum.
const CAIXA_READ_ROLES = ["owner", "manager", "kitchen", "cashier", "viewer"] as const;
const CAIXA_OPERATE_ROLES = ["owner", "manager", "cashier"] as const;
const CAIXA_FORCE_CLOSE_ROLES = ["owner", "manager"] as const;

export type TransitionBillRequestActionState = { error?: string };
export type CloseSessionActionState = { error?: string; needsForce?: boolean; openOrdersCount?: number };

/** Usado pelo painel do caixa (react-query) para reconsultar o snapshot ao reconectar/pollar. */
export async function getCaixaBoardAction() {
  const resolution = await resolveActiveEstablishment();
  if (resolution.status !== "active") {
    return { billRequests: [], openSessions: [] };
  }
  await requireTenantRole(resolution.establishment.establishmentId, CAIXA_READ_ROLES);
  return listCaixaBoard(resolution.establishment.establishmentId);
}

export async function transitionBillRequestAction(
  billRequestId: string,
  toStatus: BillRequestStatus,
  _prevState: TransitionBillRequestActionState,
  formData: FormData,
): Promise<TransitionBillRequestActionState> {
  const resolution = await resolveActiveEstablishment();
  if (resolution.status !== "active") {
    redirect("/painel");
  }
  await requireTenantRole(resolution.establishment.establishmentId, CAIXA_OPERATE_ROLES);

  try {
    await transitionBillRequest(billRequestId, toStatus, (formData.get("reason") as string) || undefined);
  } catch (err) {
    if (err instanceof AppError) {
      return { error: err.message };
    }
    return { error: "Não foi possível atualizar a solicitação." };
  }

  revalidatePath("/painel/caixa");
  return {};
}

export async function closeTableSessionAction(
  tableServiceSessionId: string,
  _prevState: CloseSessionActionState,
  formData: FormData,
): Promise<CloseSessionActionState> {
  const resolution = await resolveActiveEstablishment();
  if (resolution.status !== "active") {
    redirect("/painel");
  }
  const membership = await requireTenantRole(resolution.establishment.establishmentId, CAIXA_OPERATE_ROLES);

  const force = formData.get("force") === "true";
  if (force && !CAIXA_FORCE_CLOSE_ROLES.includes(membership.role as (typeof CAIXA_FORCE_CLOSE_ROLES)[number])) {
    return { error: "Só o proprietário ou gerente pode forçar o fechamento com pedidos em aberto." };
  }

  try {
    await closeTableSession(tableServiceSessionId, force);
  } catch (err) {
    if (err instanceof AppError && err.code === "OPEN_ORDERS_PENDING") {
      return { needsForce: true, error: err.message };
    }
    if (err instanceof AppError) {
      return { error: err.message };
    }
    return { error: "Não foi possível fechar a sessão." };
  }

  revalidatePath("/painel/caixa");
  revalidatePath("/painel/pedidos");
  return {};
}
