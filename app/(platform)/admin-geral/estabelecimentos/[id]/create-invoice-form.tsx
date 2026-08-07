"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  createInvoiceAction,
  type CreateInvoiceActionState,
} from "@/app/(platform)/admin-geral/estabelecimentos/[id]/actions";

const initialState: CreateInvoiceActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-control bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Criando…" : "Criar fatura"}
    </button>
  );
}

/** RF-ADM-006: criar fatura para um período (docs/09 §4). */
export function CreateInvoiceForm({ establishmentId }: { establishmentId: string }) {
  const boundAction = createInvoiceAction.bind(null, establishmentId);
  const [state, formAction] = useActionState(boundAction, initialState);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-card border border-neutral-200 bg-white p-4" noValidate>
      <h3 className="text-sm font-semibold text-neutral-950">Criar fatura</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="referencePeriodStart" className="text-xs font-medium text-neutral-950">
            Início do período
          </label>
          <input
            id="referencePeriodStart"
            name="referencePeriodStart"
            type="date"
            required
            defaultValue={today}
            className="rounded-control border border-neutral-200 px-2 py-1.5 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="referencePeriodEnd" className="text-xs font-medium text-neutral-950">
            Fim do período
          </label>
          <input
            id="referencePeriodEnd"
            name="referencePeriodEnd"
            type="date"
            required
            className="rounded-control border border-neutral-200 px-2 py-1.5 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="dueAt" className="text-xs font-medium text-neutral-950">
            Vencimento
          </label>
          <input
            id="dueAt"
            name="dueAt"
            type="date"
            required
            className="rounded-control border border-neutral-200 px-2 py-1.5 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="amountCents" className="text-xs font-medium text-neutral-950">
            Valor (centavos)
          </label>
          <input
            id="amountCents"
            name="amountCents"
            type="number"
            min={0}
            required
            className="rounded-control border border-neutral-200 px-2 py-1.5 text-sm"
          />
        </div>
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
