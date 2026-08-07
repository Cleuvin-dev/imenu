"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { getKitchenBoardAction } from "@/app/(establishment)/painel/pedidos/actions";
import { allowedTransitionsFor } from "@/modules/ordering/domain/transitions";
import { ORDER_TRANSITION_ACTION_LABELS } from "@/modules/ordering/domain/order-status-labels";
import {
  ALL_BOARD_COLUMNS,
  BOARD_COLUMN_LABELS,
  DEFAULT_BOARD_COLUMNS,
  boardColumnFor,
  type BoardColumnKey,
} from "@/modules/operations/domain/board-columns";
import { minutesSince, urgencyForMinutes, type OrderUrgency } from "@/modules/operations/domain/order-urgency";
import { findUnseenPendingOrderIds } from "@/modules/operations/domain/new-order-alerts";
import { readSoundPreference, writeSoundPreference } from "@/modules/operations/domain/sound-preference";
import { useRealtimeInvalidate, type RealtimeConnectionStatus } from "@/modules/operations/application/use-realtime-invalidate";
import { TransitionOrderForm } from "@/app/(establishment)/painel/pedidos/[id]/transition-order-form";
import type { KitchenBoardOrder } from "@/modules/operations/application/list-kitchen-board";
import type { Database } from "@/lib/supabase/database-types";

type MemberRole = Database["public"]["Enums"]["member_role"];

const CLOCK_TICK_MS = 30_000;

const URGENCY_CLASSES: Record<OrderUrgency, string> = {
  normal: "border-neutral-200 bg-white",
  warning: "border-warning bg-warning/5",
  urgent: "border-danger bg-danger/5",
};

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

export function KitchenBoard({
  establishmentId,
  role,
  initialOrders,
}: {
  establishmentId: string;
  role: MemberRole;
  initialOrders: KitchenBoardOrder[];
}) {
  const queryKey = useMemo(() => ["kitchen-board", establishmentId], [establishmentId]);
  const { data: orders } = useQuery({
    queryKey,
    queryFn: () => getKitchenBoardAction(),
    initialData: initialOrders,
    refetchInterval: 15_000,
  });

  const connectionStatus = useRealtimeInvalidate({ table: "orders", establishmentId, queryKey });

  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    // Relógio/idade só existem no cliente: evita divergir do HTML do servidor.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), CLOCK_TICK_MS);
    return () => clearInterval(id);
  }, []);

  const [soundEnabled, setSoundEnabled] = useState(false);
  useEffect(() => {
    // localStorage não existe durante o SSR; lido aqui após a hidratação.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSoundEnabled(readSoundPreference());
  }, []);

  const [showAllColumns, setShowAllColumns] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState<BoardColumnKey>("new");

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const seenIdsRef = useRef<Set<string> | null>(null);

  function playAlert() {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    audio.play().catch(() => {
      // Autoplay bloqueado pelo navegador: o alerta visual continua funcionando (docs/04 O-01).
    });
  }

  useEffect(() => {
    if (seenIdsRef.current === null) {
      // Primeira carga: não alerta retroativamente por pedidos já existentes no backlog.
      seenIdsRef.current = new Set(orders.filter((order) => order.status === "pending").map((order) => order.id));
      return;
    }

    const unseen = findUnseenPendingOrderIds(orders, seenIdsRef.current);
    if (unseen.length > 0) {
      if (soundEnabled) playAlert();
      for (const id of unseen) seenIdsRef.current.add(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders]);

  function handleEnableSound() {
    writeSoundPreference(true);
    setSoundEnabled(true);
    playAlert();
  }

  const columns = showAllColumns ? ALL_BOARD_COLUMNS : DEFAULT_BOARD_COLUMNS;
  const ordersByColumn = useMemo(() => {
    const grouped = new Map<BoardColumnKey, KitchenBoardOrder[]>();
    for (const column of ALL_BOARD_COLUMNS) grouped.set(column, []);
    for (const order of orders) {
      grouped.get(boardColumnFor(order.status))?.push(order);
    }
    return grouped;
  }, [orders]);

  const newOrdersCount = ordersByColumn.get("new")?.length ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-neutral-950">Pedidos</h1>
      <audio ref={audioRef} src="/sounds/new-order.wav" preload="auto" />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-neutral-200 bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${CONNECTION_DOT[connectionStatus]}`} aria-hidden="true" />
          <span className="text-xs text-neutral-600">{CONNECTION_LABEL[connectionStatus]}</span>
        </div>
        {now ? (
          <time className="text-sm font-medium text-neutral-950" dateTime={now.toISOString()}>
            {now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </time>
        ) : null}
        <div className="flex items-center gap-2">
          {!soundEnabled ? (
            <button
              type="button"
              onClick={handleEnableSound}
              className="rounded-control bg-primary-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-primary-700"
            >
              Ativar alertas sonoros
            </button>
          ) : (
            <span className="rounded-chip bg-success/10 px-2 py-1 text-xs font-medium text-success">
              Alertas sonoros ativados
            </span>
          )}
          <button
            type="button"
            onClick={playAlert}
            className="rounded-control border border-neutral-200 px-3 py-2 text-xs font-medium text-neutral-700 transition hover:border-primary-600"
          >
            Testar som
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2 overflow-x-auto md:hidden" role="tablist" aria-label="Filtrar pedidos por status">
          {columns.map((column) => (
            <button
              key={column}
              type="button"
              role="tab"
              aria-selected={selectedColumn === column}
              onClick={() => setSelectedColumn(column)}
              className={`shrink-0 rounded-control px-3 py-2 text-xs font-semibold transition ${
                selectedColumn === column ? "bg-primary-600 text-white" : "border border-neutral-200 text-neutral-700"
              }`}
            >
              {BOARD_COLUMN_LABELS[column]}
              {column === "new" && newOrdersCount > 0 ? ` (${newOrdersCount})` : ""}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setShowAllColumns((value) => !value)}
          className="text-xs font-medium text-primary-700 hover:underline"
        >
          {showAllColumns ? "Ocultar finalizados e exceções" : "Mostrar finalizados e exceções"}
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {columns.map((column) => {
          const columnOrders = ordersByColumn.get(column) ?? [];
          return (
            <section
              key={column}
              aria-label={BOARD_COLUMN_LABELS[column]}
              className={`flex-col gap-3 ${selectedColumn === column ? "flex" : "hidden"} md:flex`}
            >
              <h2 className="flex items-center gap-2 text-sm font-semibold text-neutral-950">
                {BOARD_COLUMN_LABELS[column]}
                {column === "new" && newOrdersCount > 0 ? (
                  <span className="rounded-chip bg-danger px-2 py-0.5 text-xs font-semibold text-white">
                    {newOrdersCount}
                  </span>
                ) : null}
              </h2>

              {columnOrders.length === 0 ? (
                <p className="text-xs text-neutral-600">Nenhum pedido aqui.</p>
              ) : (
                columnOrders.map((order) => {
                  const isActiveColumn = column === "new" || column === "preparing" || column === "ready";
                  const minutes = now ? minutesSince(order.created_at, now) : 0;
                  // Urgência por espera só faz sentido para pedidos que ainda aguardam ação;
                  // finalizados/exceções não devem parecer "atrasados" (docs/04 O-02).
                  const urgency = isActiveColumn ? urgencyForMinutes(minutes) : "normal";
                  const transitions = allowedTransitionsFor(order.status, role);
                  return (
                    <article
                      key={order.id}
                      className={`flex flex-col gap-2 rounded-card border-2 p-3 ${URGENCY_CLASSES[urgency]} ${
                        isActiveColumn && minutes < 1 ? "animate-pulse" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Link href={`/painel/pedidos/${order.id}`} className="font-semibold text-neutral-950 hover:underline">
                          {order.order_number} · {order.table?.name ?? "Mesa —"}
                        </Link>
                        <span className="shrink-0 text-xs font-medium text-neutral-600">{minutes} min</span>
                      </div>

                      <ul className="flex flex-col gap-1 text-xs text-neutral-700">
                        {order.items.map((item) => (
                          <li key={item.id}>
                            <span className="font-medium text-neutral-950">
                              {item.quantity}x {item.product_name_snapshot}
                            </span>
                            {item.options.length > 0 ? (
                              <span className="text-neutral-600">
                                {" — "}
                                {item.options.map((option) => option.option_name_snapshot).join(", ")}
                              </span>
                            ) : null}
                            {item.notes ? (
                              <span className="block italic text-neutral-600">&ldquo;{item.notes}&rdquo;</span>
                            ) : null}
                          </li>
                        ))}
                      </ul>

                      {order.rejection_reason ? (
                        <p className="text-xs text-neutral-600">Rejeitado: {order.rejection_reason}</p>
                      ) : null}
                      {order.cancellation_reason ? (
                        <p className="text-xs text-neutral-600">Cancelado: {order.cancellation_reason}</p>
                      ) : null}

                      {transitions.length > 0 ? (
                        <div className="flex flex-col gap-2 border-t border-neutral-200 pt-2">
                          {transitions.map((rule) => (
                            <TransitionOrderForm
                              key={rule.to}
                              orderId={order.id}
                              toStatus={rule.to}
                              label={ORDER_TRANSITION_ACTION_LABELS[rule.to]}
                              requiresReason={rule.requiresReason}
                              size="large"
                            />
                          ))}
                        </div>
                      ) : null}
                    </article>
                  );
                })
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
