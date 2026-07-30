import type { Database } from "@/lib/supabase/database-types";

export type OrderStatus = Database["public"]["Enums"]["order_status"];
export type MemberRole = Database["public"]["Enums"]["member_role"];

export type OrderTransitionRule = {
  to: OrderStatus;
  allowedRoles: readonly MemberRole[];
  requiresReason: boolean;
};

/**
 * Espelha docs/05 §3 e a validação equivalente em transition_order_status
 * (supabase/migrations/20260730100003_transition_order_status.sql). Serve
 * só para orientar a UI (mostrar/ocultar botões) — a autorização real é
 * sempre revalidada no banco, nunca só aqui.
 */
export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderTransitionRule[]> = {
  pending: [
    { to: "accepted", allowedRoles: ["kitchen", "cashier", "manager", "owner"], requiresReason: false },
    { to: "rejected", allowedRoles: ["kitchen", "cashier", "manager", "owner"], requiresReason: true },
    { to: "canceled", allowedRoles: ["cashier", "manager", "owner"], requiresReason: true },
  ],
  accepted: [
    { to: "preparing", allowedRoles: ["kitchen", "cashier", "manager", "owner"], requiresReason: false },
    { to: "canceled", allowedRoles: ["cashier", "manager", "owner"], requiresReason: true },
  ],
  preparing: [
    { to: "ready", allowedRoles: ["kitchen", "cashier", "manager", "owner"], requiresReason: false },
    { to: "canceled", allowedRoles: ["cashier", "manager", "owner"], requiresReason: true },
  ],
  ready: [
    { to: "delivered", allowedRoles: ["cashier", "manager", "owner"], requiresReason: false },
    { to: "canceled", allowedRoles: ["cashier", "manager", "owner"], requiresReason: true },
  ],
  delivered: [],
  rejected: [],
  canceled: [],
};

export function allowedTransitionsFor(status: OrderStatus, role: MemberRole): OrderTransitionRule[] {
  return ORDER_TRANSITIONS[status].filter((rule) => rule.allowedRoles.includes(role));
}
