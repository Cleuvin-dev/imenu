"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createPlanAction, type PlanFormActionState } from "@/app/(platform)/admin-geral/planos/actions";

const initialState: PlanFormActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-control bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Criando…" : "Criar plano"}
    </button>
  );
}

export function CreatePlanForm() {
  const [state, formAction] = useActionState(createPlanAction, initialState);

  return (
    <form
      key={state.success ? "reset" : "form"}
      action={formAction}
      className="flex flex-col gap-3 rounded-card border border-neutral-200 bg-white p-4"
      noValidate
    >
      <h2 className="text-sm font-semibold text-neutral-950">Novo plano</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="code" className="text-xs font-medium text-neutral-950">
            Código
          </label>
          <input id="code" name="code" required maxLength={60} placeholder="essencial" className="rounded-control border border-neutral-200 px-2 py-1.5 text-sm" />
          {state.fieldErrors?.code ? <p className="text-xs text-danger">{state.fieldErrors.code[0]}</p> : null}
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="name" className="text-xs font-medium text-neutral-950">
            Nome
          </label>
          <input id="name" name="name" required maxLength={120} className="rounded-control border border-neutral-200 px-2 py-1.5 text-sm" />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="priceCents" className="text-xs font-medium text-neutral-950">
            Preço mensal (centavos)
          </label>
          <input id="priceCents" name="priceCents" type="number" min={0} required className="rounded-control border border-neutral-200 px-2 py-1.5 text-sm" />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="billingIntervalMonths" className="text-xs font-medium text-neutral-950">
            Periodicidade (meses)
          </label>
          <input
            id="billingIntervalMonths"
            name="billingIntervalMonths"
            type="number"
            min={1}
            max={24}
            defaultValue={1}
            className="rounded-control border border-neutral-200 px-2 py-1.5 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="maxProducts" className="text-xs font-medium text-neutral-950">
            Limite de produtos
          </label>
          <input id="maxProducts" name="maxProducts" type="number" min={0} className="rounded-control border border-neutral-200 px-2 py-1.5 text-sm" />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="maxTables" className="text-xs font-medium text-neutral-950">
            Limite de mesas
          </label>
          <input id="maxTables" name="maxTables" type="number" min={0} className="rounded-control border border-neutral-200 px-2 py-1.5 text-sm" />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="maxMembers" className="text-xs font-medium text-neutral-950">
            Limite de usuários
          </label>
          <input id="maxMembers" name="maxMembers" type="number" min={0} className="rounded-control border border-neutral-200 px-2 py-1.5 text-sm" />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="maxMediaStorageMb" className="text-xs font-medium text-neutral-950">
            Armazenamento (MB)
          </label>
          <input
            id="maxMediaStorageMb"
            name="maxMediaStorageMb"
            type="number"
            min={0}
            className="rounded-control border border-neutral-200 px-2 py-1.5 text-sm"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-neutral-700">
        <input type="checkbox" name="isActive" defaultChecked />
        Plano ativo (disponível para novas assinaturas)
      </label>

      {state.error ? (
        <p role="alert" className="rounded-control bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}
