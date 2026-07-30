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
