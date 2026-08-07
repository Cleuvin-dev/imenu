"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { addAdminAction, type AddAdminActionState } from "@/app/(platform)/admin-geral/administradores/actions";
import { PLATFORM_ROLE_LABELS } from "@/modules/platform-admin/domain/platform-role-labels";

const initialState: AddAdminActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-control bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Adicionando…" : "Adicionar"}
    </button>
  );
}

export function AddAdminForm() {
  const [state, formAction] = useActionState(addAdminAction, initialState);

  if (state.success) {
    return (
      <div className="flex flex-col gap-3 rounded-card border border-primary-200 bg-primary-50 p-4 text-sm text-primary-900">
        <p className="font-semibold">Administrador adicionado.</p>
        {state.success.temporaryPassword ? (
          <>
            <p>
              Senha temporária da nova conta (repasse por um canal seguro, ela não fica salva em nenhum outro
              lugar):
            </p>
            <code className="rounded-control bg-white px-3 py-2 text-sm text-neutral-950">
              {state.success.temporaryPassword}
            </code>
          </>
        ) : (
          <p>A pessoa já tinha uma conta iMenu — o papel foi concedido à conta existente.</p>
        )}
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-card border border-neutral-200 bg-white p-4" noValidate>
      <h2 className="text-sm font-semibold text-neutral-950">Adicionar administrador</h2>
      <p className="text-xs text-neutral-600">
        Cadastre um funcionário da iMenu (admin, suporte etc.). Se o e-mail ainda não tiver conta, ela é criada
        agora com uma senha temporária para você repassar.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="displayName" className="text-xs font-medium text-neutral-950">
            Nome completo
          </label>
          <input
            id="displayName"
            name="displayName"
            required
            maxLength={120}
            className="rounded-control border border-neutral-200 px-3 py-2 text-sm"
          />
          {state.fieldErrors?.displayName?.[0] ? (
            <p className="text-xs text-danger">{state.fieldErrors.displayName[0]}</p>
          ) : null}
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="email" className="text-xs font-medium text-neutral-950">
            E-mail
          </label>
          <input id="email" name="email" type="email" required className="rounded-control border border-neutral-200 px-3 py-2 text-sm" />
          {state.fieldErrors?.email?.[0] ? <p className="text-xs text-danger">{state.fieldErrors.email[0]}</p> : null}
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="role" className="text-xs font-medium text-neutral-950">
            Papel
          </label>
          <select id="role" name="role" required defaultValue="platform_support" className="rounded-control border border-neutral-200 px-3 py-2 text-sm">
            {Object.entries(PLATFORM_ROLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <SubmitButton />
      </div>
      {state.error ? (
        <p role="alert" className="rounded-control bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
