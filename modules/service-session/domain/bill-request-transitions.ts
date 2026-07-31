import type { Database } from "@/lib/supabase/database-types";
import type { BillRequestStatus } from "@/modules/service-session/schemas/bill-request.schema";

export type MemberRole = Database["public"]["Enums"]["member_role"];

export type BillRequestTransitionRule = {
  to: BillRequestStatus;
  allowedRoles: readonly MemberRole[];
  requiresReason: boolean;
};

/**
 * Espelha a validação em `transition_bill_request_status`
 * (supabase/migrations/20260730130001_bill_request_functions.sql). Fechar a
 * sessão é uma ação própria (`close_table_session`), não uma transição
 * daqui — ver comentário na migração.
 */
export const BILL_REQUEST_TRANSITIONS: Record<BillRequestStatus, readonly BillRequestTransitionRule[]> = {
  requested: [
    { to: "acknowledged", allowedRoles: ["cashier", "manager", "owner"], requiresReason: false },
    { to: "canceled", allowedRoles: ["cashier", "manager", "owner"], requiresReason: true },
  ],
  acknowledged: [
    { to: "bill_delivered", allowedRoles: ["cashier", "manager", "owner"], requiresReason: false },
    { to: "canceled", allowedRoles: ["cashier", "manager", "owner"], requiresReason: true },
  ],
  bill_delivered: [],
  closed: [],
  canceled: [],
};

export function allowedBillRequestTransitionsFor(
  status: BillRequestStatus,
  role: MemberRole,
): BillRequestTransitionRule[] {
  return BILL_REQUEST_TRANSITIONS[status].filter((rule) => rule.allowedRoles.includes(role));
}
