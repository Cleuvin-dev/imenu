"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AppError } from "@/lib/errors/app-error";
import { requireTenantRole } from "@/lib/auth/tenant";
import { resolveActiveEstablishment } from "@/modules/tenancy/application/resolve-active-establishment";
import { transitionOrder } from "@/modules/ordering/application/transition-order";
import { listKitchenBoardOrders, type KitchenBoardOrder } from "@/modules/operations/application/list-kitchen-board";
import type { Database } from "@/lib/supabase/database-types";

type OrderStatus = Database["public"]["Enums"]["order_status"];

const ORDER_OPERATIONAL_ROLES = ["owner", "manager", "kitchen", "cashier"] as const;

export type TransitionOrderActionState = { error?: string };

/**
 * Usado pelo KDS (react-query) para reconsultar o snapshot ao reconectar, ao
 * receber um evento Realtime e no polling de segurança de 15s (docs/05 §7).
 * Sem parâmetro de estabelecimento vindo do cliente: sempre resolve o tenant
 * ativo da sessão no servidor.
 */
export async function getKitchenBoardAction(): Promise<KitchenBoardOrder[]> {
  const resolution = await resolveActiveEstablishment();
  if (resolution.status !== "active") {
    return [];
  }
  return listKitchenBoardOrders(resolution.establishment.establishmentId);
}

/**
 * Checagem ampla de papel aqui (defesa em profundidade); a validação exata
 * por transição acontece em transition_order_status (docs/02 §5 regra 3).
 */
export async function transitionOrderAction(
  orderId: string,
  toStatus: OrderStatus,
  _prevState: TransitionOrderActionState,
  formData: FormData,
): Promise<TransitionOrderActionState> {
  const resolution = await resolveActiveEstablishment();
  if (resolution.status !== "active") {
    redirect("/painel");
  }
  await requireTenantRole(resolution.establishment.establishmentId, ORDER_OPERATIONAL_ROLES);

  try {
    await transitionOrder(orderId, toStatus, (formData.get("reason") as string) || undefined);
  } catch (err) {
    if (err instanceof AppError) {
      return { error: err.message };
    }
    return { error: "Não foi possível atualizar o status do pedido." };
  }

  revalidatePath(`/painel/pedidos/${orderId}`);
  revalidatePath("/painel/pedidos");
  return {};
}
