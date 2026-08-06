"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import {
  createEstablishmentAction,
  type CreateEstablishmentActionState,
} from "@/app/(platform)/admin-geral/estabelecimentos/novo/actions";

const initialState: CreateEstablishmentActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-control bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Cadastrando…" : "Cadastrar estabelecimento"}
    </button>
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-neutral-950">
        {label}
      </label>
      {children}
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}

export function CreateEstablishmentForm({ plans }: { plans: { id: string; name: string }[] }) {
  const [state, formAction] = useActionState(createEstablishmentAction, initialState);

  if (state.success) {
    return (
      <div className="flex flex-col gap-3 rounded-card border border-primary-200 bg-primary-50 p-4 text-sm text-primary-900">
        <p className="font-semibold">Estabelecimento cadastrado.</p>
        <p>
          Senha temporária do proprietário (repasse por um canal seguro, ela não fica salva em nenhum outro
          lugar):
        </p>
        <code className="rounded-control bg-white px-3 py-2 text-sm text-neutral-950">
          {state.success.temporaryPassword}
        </code>
        <Link
          href={`/admin-geral/estabelecimentos/${state.success.establishmentId}`}
          className="w-fit rounded-control bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700"
        >
          Ver estabelecimento
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-card border border-neutral-200 bg-white p-4" noValidate>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field id="tradeName" label="Nome fantasia" error={state.fieldErrors?.tradeName?.[0]}>
          <input id="tradeName" name="tradeName" required maxLength={180} className="rounded-control border border-neutral-200 px-3 py-2 text-sm" />
        </Field>
        <Field id="legalName" label="Razão social" error={state.fieldErrors?.legalName?.[0]}>
          <input id="legalName" name="legalName" required maxLength={180} className="rounded-control border border-neutral-200 px-3 py-2 text-sm" />
        </Field>
        <Field id="documentNumber" label="CNPJ/documento (opcional)">
          <input id="documentNumber" name="documentNumber" maxLength={32} className="rounded-control border border-neutral-200 px-3 py-2 text-sm" />
        </Field>
        <Field id="email" label="E-mail do estabelecimento (opcional)" error={state.fieldErrors?.email?.[0]}>
          <input id="email" name="email" type="email" className="rounded-control border border-neutral-200 px-3 py-2 text-sm" />
        </Field>
        <Field id="phone" label="Telefone (opcional)">
          <input id="phone" name="phone" maxLength={32} className="rounded-control border border-neutral-200 px-3 py-2 text-sm" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field id="city" label="Cidade (opcional)">
            <input id="city" name="city" maxLength={120} className="rounded-control border border-neutral-200 px-3 py-2 text-sm" />
          </Field>
          <Field id="stateCode" label="UF (opcional)" error={state.fieldErrors?.stateCode?.[0]}>
            <input id="stateCode" name="stateCode" maxLength={2} className="rounded-control border border-neutral-200 px-3 py-2 text-sm uppercase" />
          </Field>
        </div>
      </div>

      <Field id="planId" label="Plano" error={state.fieldErrors?.planId?.[0]}>
        <select id="planId" name="planId" required className="rounded-control border border-neutral-200 px-3 py-2 text-sm">
          <option value="">Selecione…</option>
          {plans.map((plan) => (
            <option key={plan.id} value={plan.id}>
              {plan.name}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-1 gap-3 border-t border-neutral-200 pt-4 sm:grid-cols-2">
        <Field id="ownerDisplayName" label="Nome do proprietário" error={state.fieldErrors?.ownerDisplayName?.[0]}>
          <input id="ownerDisplayName" name="ownerDisplayName" required maxLength={120} className="rounded-control border border-neutral-200 px-3 py-2 text-sm" />
        </Field>
        <Field id="ownerEmail" label="E-mail do proprietário (login)" error={state.fieldErrors?.ownerEmail?.[0]}>
          <input id="ownerEmail" name="ownerEmail" type="email" required className="rounded-control border border-neutral-200 px-3 py-2 text-sm" />
        </Field>
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
