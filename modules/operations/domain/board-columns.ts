import type { Database } from "@/lib/supabase/database-types";

export type OrderStatus = Database["public"]["Enums"]["order_status"];

export type BoardColumnKey = "new" | "preparing" | "ready" | "finished" | "exception";

export const BOARD_COLUMN_LABELS: Record<BoardColumnKey, string> = {
  new: "Novos",
  preparing: "Em preparo",
  ready: "Prontos",
  finished: "Finalizados",
  exception: "Exceções",
};

/** Colunas exibidas por padrão no KDS (docs/04 O-02); as demais ficam atrás de um filtro. */
export const DEFAULT_BOARD_COLUMNS: readonly BoardColumnKey[] = ["new", "preparing", "ready"];
export const ALL_BOARD_COLUMNS: readonly BoardColumnKey[] = ["new", "preparing", "ready", "finished", "exception"];

const COLUMN_BY_STATUS: Record<OrderStatus, BoardColumnKey> = {
  pending: "new",
  accepted: "preparing",
  preparing: "preparing",
  ready: "ready",
  delivered: "finished",
  rejected: "exception",
  canceled: "exception",
};

export function boardColumnFor(status: OrderStatus): BoardColumnKey {
  return COLUMN_BY_STATUS[status];
}
