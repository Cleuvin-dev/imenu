"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { transitionOrderAction, type TransitionOrderActionState } from "@/app/(establishment)/painel/pedidos/actions";
import type { Database } from "@/lib/supabase/database-types";

type OrderStatus = Database["public"]["Enums"]["order_status"];

const initialState: TransitionOrderActionState = {};

const BUTTON_SIZE_CLASSES = {
  compact: "px-3 py-2 text-xs",
  large: "w-full px-4 py-3 text-sm",
} as const;

function SubmitButton({
  label,
  isDanger,
  size,
}: {
  label: string;
  isDanger: boolean;
  size: "compact" | "large";
}) {
  const { pending } = useFormStatus();
  const base = isDanger
    ? "rounded-control border border-danger font-semibold text-danger transition hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-60"
    : "rounded-control bg-primary-600 font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <button type="submit" disabled={pending} className={`${base} ${BUTTON_SIZE_CLASSES[size]}`}>
      {pending ? "Enviando…" : label}
    </button>
  );
}

export function TransitionOrderForm({
  orderId,
  toStatus,
  label,
  requiresReason,
  size = "compact",
}: {
  orderId: string;
  toStatus: OrderStatus;
  label: string;
  requiresReason: boolean;
  size?: "compact" | "large";
}) {
  const boundAction = transitionOrderAction.bind(null, orderId, toStatus);
  const [state, formAction] = useActionState(boundAction, initialState);
  const isDanger = toStatus === "rejected" || toStatus === "canceled";

  return (
    <form action={formAction} className="flex flex-col gap-2">
      {requiresReason ? (
        <textarea
          name="reason"
          required
          maxLength={300}
          rows={2}
          placeholder="Motivo (obrigatório)"
          aria-label={`Motivo para ${label.toLowerCase()}`}
          className={`rounded-control border border-neutral-200 px-2 py-1 text-xs ${size === "large" ? "w-full" : "w-48"}`}
        />
      ) : null}
      {state.error ? (
        <p role="alert" className="text-xs text-danger">
          {state.error}
        </p>
      ) : null}
      <SubmitButton label={label} isDanger={isDanger} size={size} />
    </form>
  );
}
