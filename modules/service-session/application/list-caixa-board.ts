import "server-only";
import { AppError } from "@/lib/errors/app-error";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database-types";

type OrderStatus = Database["public"]["Enums"]["order_status"];
type BillRequestStatus = Database["public"]["Enums"]["bill_request_status"];

const OPEN_ORDER_STATUSES: readonly OrderStatus[] = ["pending", "accepted", "preparing", "ready"];
const OPERATIONAL_WINDOW_MS = 24 * 60 * 60 * 1000;

export type CaixaBillRequest = {
  id: string;
  status: BillRequestStatus;
  requested_at: string;
  cancellation_reason: string | null;
  table_service_session_id: string;
  table: { name: string } | null;
  total_cents: number;
  open_orders_count: number;
};

export type CaixaOpenSession = {
  id: string;
  opened_at: string;
  table: { name: string } | null;
  total_cents: number;
  open_orders_count: number;
  active_bill_request_status: BillRequestStatus | null;
};

export type CaixaBoard = {
  billRequests: CaixaBillRequest[];
  openSessions: CaixaOpenSession[];
};

/** Snapshot do caixa (docs/04 O-04): solicitações de conta + mesas abertas, sem N+1. */
export async function listCaixaBoard(establishmentId: string, requestId: string = crypto.randomUUID()): Promise<CaixaBoard> {
  const supabase = await createSupabaseServerClient();
  const windowStart = new Date(Date.now() - OPERATIONAL_WINDOW_MS).toISOString();

  const [billRequestsResult, openSessionsResult] = await Promise.all([
    supabase
      .from("bill_requests")
      .select(
        "id, status, requested_at, cancellation_reason, table_service_session_id, table:dining_tables(name)",
      )
      .eq("establishment_id", establishmentId)
      .gte("requested_at", windowStart)
      .order("requested_at", { ascending: false })
      .limit(200),
    supabase
      .from("table_service_sessions")
      .select("id, opened_at, table:dining_tables(name)")
      .eq("establishment_id", establishmentId)
      .eq("status", "open")
      .order("opened_at", { ascending: true })
      .limit(200),
  ]);

  if (billRequestsResult.error || openSessionsResult.error) {
    throw new AppError("INTERNAL_ERROR", { requestId });
  }

  const billRequests = billRequestsResult.data ?? [];
  const openSessions = openSessionsResult.data ?? [];

  const sessionIds = Array.from(
    new Set([...billRequests.map((b) => b.table_service_session_id), ...openSessions.map((s) => s.id)]),
  );

  const { data: orders } =
    sessionIds.length > 0
      ? await supabase
          .from("orders")
          .select("table_service_session_id, status, total_cents")
          .in("table_service_session_id", sessionIds)
      : { data: [] };

  function totalsFor(sessionId: string) {
    const sessionOrders = (orders ?? []).filter((o) => o.table_service_session_id === sessionId);
    const totalCents = sessionOrders
      .filter((o) => o.status !== "rejected" && o.status !== "canceled")
      .reduce((sum, o) => sum + o.total_cents, 0);
    const openOrdersCount = sessionOrders.filter((o) => OPEN_ORDER_STATUSES.includes(o.status)).length;
    return { totalCents, openOrdersCount };
  }

  const activeBillRequestBySession = new Map<string, BillRequestStatus>();
  for (const bill of billRequests) {
    if (bill.status === "requested" || bill.status === "acknowledged" || bill.status === "bill_delivered") {
      activeBillRequestBySession.set(bill.table_service_session_id, bill.status);
    }
  }

  return {
    billRequests: billRequests.map((bill) => {
      const totals = totalsFor(bill.table_service_session_id);
      return {
        id: bill.id,
        status: bill.status,
        requested_at: bill.requested_at,
        cancellation_reason: bill.cancellation_reason,
        table_service_session_id: bill.table_service_session_id,
        table: bill.table,
        total_cents: totals.totalCents,
        open_orders_count: totals.openOrdersCount,
      };
    }),
    openSessions: openSessions.map((session) => {
      const totals = totalsFor(session.id);
      return {
        id: session.id,
        opened_at: session.opened_at,
        table: session.table,
        total_cents: totals.totalCents,
        open_orders_count: totals.openOrdersCount,
        active_bill_request_status: activeBillRequestBySession.get(session.id) ?? null,
      };
    }),
  };
}
