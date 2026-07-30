"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  confirmPaymentAction,
  type ConfirmPaymentActionState,
} from "@/app/(platform)/admin-geral/estabelecimentos/[id]/actions";
import { formatMoney } from "@/lib/money";
import { PAYMENT_METHOD_LABELS } from "@/modules/billing/domain/labels";

const initialState: ConfirmPaymentActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center rounded-control bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Confirmando…" : "Confirmar pagamento"}
    </button>
  );
}

export function ConfirmPaymentForm({
  establishmentId,
  invoiceId,
  amountCents,
}: {
  establishmentId: string;
  invoiceId: string;
  amountCents: number;
}) {
  const boundAction = confirmPaymentAction.bind(null, establishmentId);
  const [state, formAction] = useActionState(boundAction, initialState);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="flex flex-col gap-3 border-t border-neutral-200 pt-3">
      <input type="hidden" name="invoiceId" value={invoiceId} />
      <input type="hidden" name="amountCents" value={amountCents} />
      <p className="text-sm text-neutral-600">
        Confirmar quitação integral de <strong className="text-neutral-950">{formatMoney(amountCents)}</strong>
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor={`paidAt-${invoiceId}`} className="text-xs font-medium text-neutral-950">
            Data do pagamento
          </label>
          <input
            id={`paidAt-${invoiceId}`}
            name="paidAt"
            type="date"
            defaultValue={today}
            required
            className="rounded-control border border-neutral-200 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`method-${invoiceId}`} className="text-xs font-medium text-neutral-950">
            Método
          </label>
          <select
            id={`method-${invoiceId}`}
            name="method"
            required
            className="rounded-control border border-neutral-200 px-3 py-2 text-sm"
          >
            {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={`reference-${invoiceId}`} className="text-xs font-medium text-neutral-950">
          Referência/comprovante (opcional)
        </label>
        <input
          id={`reference-${invoiceId}`}
          name="reference"
          type="text"
          maxLength={200}
          className="rounded-control border border-neutral-200 px-3 py-2 text-sm"
        />
      </div>
      {state.error ? (
        <p role="alert" className="rounded-control bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      <SubmitButton />
    </form>
  );
}
