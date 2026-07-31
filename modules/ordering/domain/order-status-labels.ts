import type { Database } from "@/lib/supabase/database-types";

export type OrderStatus = Database["public"]["Enums"]["order_status"];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Aguardando confirmação",
  accepted: "Aceito",
  preparing: "Em preparo",
  ready: "Pronto",
  delivered: "Entregue",
  rejected: "Rejeitado",
  canceled: "Cancelado",
};

/** Rótulo do botão de ação (verbo no imperativo), distinto do nome do status de destino. */
export const ORDER_TRANSITION_ACTION_LABELS: Record<OrderStatus, string> = {
  pending: "Reabrir",
  accepted: "Aceitar",
  preparing: "Iniciar preparo",
  ready: "Marcar pronto",
  delivered: "Marcar entregue",
  rejected: "Rejeitar",
  canceled: "Cancelar",
};
