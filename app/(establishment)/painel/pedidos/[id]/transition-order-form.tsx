"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { transitionOrderAction, type TransitionOrderActionState } from "@/app/(establishment)/painel/pedidos/actions";
import type { Database } from "@/lib/supabase/database-types";

type OrderStatus = Database["public"]["Enums"]["order_status"];

const initialState: TransitionOrderActionState = {};

function SubmitButton({ label, isDanger }: { label: string; isDanger: boolean }) {
  const { pending } = useFormStatus();
  const className = isDanger
    ? "rounded-control border border-danger px-3 py-2 text-xs font-semibold text-danger transition hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-60"
    : "rounded-control bg-primary-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? "Enviando…" : label}
    </button>
  );
}

export function TransitionOrderForm({
  orderId,
  toStatus,
  label,
  requiresReason,
}: {
  orderId: string;
  toStatus: OrderStatus;
  label: string;
  requiresReason: boolean;
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
          className="w-48 rounded-control border border-neutral-200 px-2 py-1 text-xs"
        />
      ) : null}
      {state.error ? (
        <p role="alert" className="text-xs text-danger">
          {state.error}
        </p>
      ) : null}
      <SubmitButton label={label} isDanger={isDanger} />
    </form>
  );
}
