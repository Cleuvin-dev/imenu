"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  updateEstablishmentAction,
  type UpdateEstablishmentActionState,
} from "@/app/(platform)/admin-geral/estabelecimentos/[id]/actions";

const initialState: UpdateEstablishmentActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-control bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Salvando…" : "Salvar cadastro"}
    </button>
  );
}

export function EditEstablishmentForm({
  establishmentId,
  establishment,
}: {
  establishmentId: string;
  establishment: {
    legalName: string;
    tradeName: string;
    documentNumber: string | null;
    email: string | null;
    phone: string | null;
    city: string | null;
    stateCode: string | null;
    isActive: boolean;
  };
}) {
  const boundAction = updateEstablishmentAction.bind(null, establishmentId);
  const [state, formAction] = useActionState(boundAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="tradeName" className="text-xs font-medium text-neutral-950">
            Nome fantasia
          </label>
          <input
            id="tradeName"
            name="tradeName"
            required
            maxLength={180}
            defaultValue={establishment.tradeName}
            className="rounded-control border border-neutral-200 px-3 py-2 text-sm"
          />
          {state.fieldErrors?.tradeName ? <p className="text-xs text-danger">{state.fieldErrors.tradeName[0]}</p> : null}
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="legalName" className="text-xs font-medium text-neutral-950">
            Razão social
          </label>
          <input
            id="legalName"
            name="legalName"
            required
            maxLength={180}
            defaultValue={establishment.legalName}
            className="rounded-control border border-neutral-200 px-3 py-2 text-sm"
          />
          {state.fieldErrors?.legalName ? <p className="text-xs text-danger">{state.fieldErrors.legalName[0]}</p> : null}
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="documentNumber" className="text-xs font-medium text-neutral-950">
            CNPJ/documento
          </label>
          <input
            id="documentNumber"
            name="documentNumber"
            maxLength={32}
            defaultValue={establishment.documentNumber ?? ""}
            className="rounded-control border border-neutral-200 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-xs font-medium text-neutral-950">
            E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={establishment.email ?? ""}
            className="rounded-control border border-neutral-200 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="phone" className="text-xs font-medium text-neutral-950">
            Telefone
          </label>
          <input
            id="phone"
            name="phone"
            maxLength={32}
            defaultValue={establishment.phone ?? ""}
            className="rounded-control border border-neutral-200 px-3 py-2 text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="city" className="text-xs font-medium text-neutral-950">
              Cidade
            </label>
            <input
              id="city"
              name="city"
              maxLength={120}
              defaultValue={establishment.city ?? ""}
              className="rounded-control border border-neutral-200 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="stateCode" className="text-xs font-medium text-neutral-950">
              UF
            </label>
            <input
              id="stateCode"
              name="stateCode"
              maxLength={2}
              defaultValue={establishment.stateCode ?? ""}
              className="rounded-control border border-neutral-200 px-3 py-2 text-sm uppercase"
            />
          </div>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-neutral-700">
        <input type="checkbox" name="isActive" defaultChecked={establishment.isActive} />
        Estabelecimento ativo
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
