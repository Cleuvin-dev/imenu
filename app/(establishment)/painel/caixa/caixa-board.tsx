"use client";

import { useEffect, useMemo, useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { formatMoney } from "@/lib/money";
import { minutesSince } from "@/modules/operations/domain/order-urgency";
import { useRealtimeInvalidate, type RealtimeConnectionStatus } from "@/modules/operations/application/use-realtime-invalidate";
import {
  BILL_REQUEST_STATUS_LABELS,
  BILL_REQUEST_ACTION_LABELS,
} from "@/modules/service-session/domain/bill-request-labels";
import { allowedBillRequestTransitionsFor } from "@/modules/service-session/domain/bill-request-transitions";
import {
  getCaixaBoardAction,
  transitionBillRequestAction,
  closeTableSessionAction,
  type TransitionBillRequestActionState,
  type CloseSessionActionState,
} from "@/app/(establishment)/painel/caixa/actions";
import type { CaixaBoard } from "@/modules/service-session/application/list-caixa-board";
import type { Database } from "@/lib/supabase/database-types";

type MemberRole = Database["public"]["Enums"]["member_role"];
type BillRequestStatus = Database["public"]["Enums"]["bill_request_status"];

const CONNECTION_LABEL: Record<RealtimeConnectionStatus, string> = {
  connecting: "Conectando…",
  connected: "Conectado em tempo real",
  disconnected: "Sem conexão em tempo real — atualizando por polling",
};

const CONNECTION_DOT: Record<RealtimeConnectionStatus, string> = {
  connecting: "bg-warning",
  connected: "bg-success",
  disconnected: "bg-danger",
};

const initialTransitionState: TransitionBillRequestActionState = {};
const initialCloseState: CloseSessionActionState = {};

function SubmitButton({ label, danger }: { label: string; danger?: boolean }) {
  const { pending } = useFormStatus();
  const className = danger
    ? "rounded-control border border-danger px-3 py-2 text-xs font-semibold text-danger transition hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-60"
    : "rounded-control bg-primary-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60";
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? "Enviando…" : label}
    </button>
  );
}

function TransitionForm({
  billRequestId,
  toStatus,
  requiresReason,
}: {
  billRequestId: string;
  toStatus: BillRequestStatus;
  requiresReason: boolean;
}) {
  const boundAction = transitionBillRequestAction.bind(null, billRequestId, toStatus);
  const [state, formAction] = useActionState(boundAction, initialTransitionState);
  return (
    <form action={formAction} className="flex flex-col gap-2">
      {requiresReason ? (
        <textarea
          name="reason"
          required
          maxLength={300}
          rows={2}
          placeholder="Motivo (obrigatório)"
          className="w-full rounded-control border border-neutral-200 px-2 py-1 text-xs"
        />
      ) : null}
      {state.error ? (
        <p role="alert" className="text-xs text-danger">
          {state.error}
        </p>
      ) : null}
      <SubmitButton label={BILL_REQUEST_ACTION_LABELS[toStatus] ?? toStatus} danger={toStatus === "canceled"} />
    </form>
  );
}

function CloseSessionForm({ sessionId, openOrdersCount }: { sessionId: string; openOrdersCount: number }) {
  const boundAction = closeTableSessionAction.bind(null, sessionId);
  const [state, formAction] = useActionState(boundAction, initialCloseState);
  const [forcing, setForcing] = useState(false);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="force" value={forcing ? "true" : "false"} />
      {state.error ? (
        <p role="alert" className="text-xs text-danger">
          {state.error}
        </p>
      ) : null}
      {state.needsForce && !forcing ? (
        <button
          type="button"
          onClick={() => setForcing(true)}
          className="rounded-control border border-danger px-3 py-2 text-xs font-semibold text-danger transition hover:bg-danger/10"
        >
          Forçar fechamento mesmo com pedidos em aberto
        </button>
      ) : (
        <SubmitButton
          label={openOrdersCount > 0 ? `Fechar sessão (${openOrdersCount} pedido(s) em aberto)` : "Fechar sessão"}
          danger={openOrdersCount > 0}
        />
      )}
    </form>
  );
}

export function CaixaBoard({
  establishmentId,
  role,
  initialBoard,
}: {
  establishmentId: string;
  role: MemberRole;
  initialBoard: CaixaBoard;
}) {
  const queryKey = useMemo(() => ["caixa-board", establishmentId], [establishmentId]);
  const { data: board } = useQuery({
    queryKey,
    queryFn: () => getCaixaBoardAction(),
    initialData: initialBoard,
    refetchInterval: 15_000,
  });

  const billStatus = useRealtimeInvalidate({ table: "bill_requests", establishmentId, queryKey });
  useRealtimeInvalidate({ table: "table_service_sessions", establishmentId, queryKey });
  useRealtimeInvalidate({ table: "orders", establishmentId, queryKey });

  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const activeBillRequests = board.billRequests.filter(
    (bill) => bill.status === "requested" || bill.status === "acknowledged" || bill.status === "bill_delivered",
  );
  const resolvedBillRequests = board.billRequests.filter((bill) => !activeBillRequests.includes(bill));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2 rounded-card border border-neutral-200 bg-white px-4 py-3">
        <span className={`h-2.5 w-2.5 rounded-full ${CONNECTION_DOT[billStatus]}`} aria-hidden="true" />
        <span className="text-xs text-neutral-600">{CONNECTION_LABEL[billStatus]}</span>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-neutral-950">Solicitações de conta</h2>
        {activeBillRequests.length === 0 ? (
          <p className="text-xs text-neutral-600">Nenhuma solicitação ativa.</p>
        ) : (
          activeBillRequests.map((bill) => {
            const minutes = now ? minutesSince(bill.requested_at, now) : 0;
            const transitions = allowedBillRequestTransitionsFor(bill.status, role);
            return (
              <article key={bill.id} className="flex flex-col gap-2 rounded-card border-2 border-primary-600 bg-primary-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-neutral-950">{bill.table?.name ?? "Mesa —"}</p>
                  <span className="text-xs font-medium text-neutral-600">{minutes} min</span>
                </div>
                <p className="text-sm text-neutral-700">
                  {BILL_REQUEST_STATUS_LABELS[bill.status]} · {formatMoney(bill.total_cents)}
                </p>
                {bill.open_orders_count > 0 ? (
                  <p className="text-xs text-warning">{bill.open_orders_count} pedido(s) ainda não finalizados.</p>
                ) : null}
                <div className="flex flex-wrap gap-2 border-t border-primary-200 pt-2">
                  {transitions.map((rule) => (
                    <TransitionForm
                      key={rule.to}
                      billRequestId={bill.id}
                      toStatus={rule.to}
                      requiresReason={rule.requiresReason}
                    />
                  ))}
                  <CloseSessionForm sessionId={bill.table_service_session_id} openOrdersCount={bill.open_orders_count} />
                </div>
              </article>
            );
          })
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-neutral-950">Mesas abertas</h2>
        {board.openSessions.length === 0 ? (
          <p className="text-xs text-neutral-600">Nenhuma mesa com sessão aberta.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {board.openSessions.map((session) => (
              <div
                key={session.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-neutral-200 bg-white p-3"
              >
                <div>
                  <p className="font-medium text-neutral-950">{session.table?.name ?? "Mesa —"}</p>
                  <p className="text-xs text-neutral-600">
                    {formatMoney(session.total_cents)}
                    {session.active_bill_request_status
                      ? ` · ${BILL_REQUEST_STATUS_LABELS[session.active_bill_request_status]}`
                      : ""}
                    {session.open_orders_count > 0 ? ` · ${session.open_orders_count} pedido(s) em aberto` : ""}
                  </p>
                </div>
                {!session.active_bill_request_status ? (
                  <CloseSessionForm sessionId={session.id} openOrdersCount={session.open_orders_count} />
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>

      {resolvedBillRequests.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-neutral-950">Solicitações recentes</h2>
          <ul className="flex flex-col gap-1">
            {resolvedBillRequests.map((bill) => (
              <li key={bill.id} className="flex items-center justify-between text-xs text-neutral-600">
                <span>
                  {bill.table?.name ?? "Mesa —"} · {BILL_REQUEST_STATUS_LABELS[bill.status]}
                </span>
                <span>{formatMoney(bill.total_cents)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
