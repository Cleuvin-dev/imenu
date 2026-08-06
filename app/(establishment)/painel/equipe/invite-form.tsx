"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { createInviteAction, type CreateInviteActionState } from "@/app/(establishment)/painel/equipe/actions";
import { MEMBER_ROLE_LABELS } from "@/modules/tenancy/domain/member-role-labels";

const INVITABLE_ROLES = Object.keys(MEMBER_ROLE_LABELS) as (keyof typeof MEMBER_ROLE_LABELS)[];

const initialState: CreateInviteActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-control bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Convidando…" : "Convidar"}
    </button>
  );
}

function CopyLinkButton({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="rounded-control border border-primary-600 px-3 py-1.5 text-xs font-medium text-primary-700 transition hover:bg-primary-50"
    >
      {copied ? "Link copiado!" : "Copiar link"}
    </button>
  );
}

/** E-07: convidar membro. Sem provedor de e-mail configurado, o link deve ser mostrado explicitamente (docs/02 §6). */
export function InviteForm() {
  const [state, formAction] = useActionState(createInviteAction, initialState);

  return (
    <div className="flex flex-col gap-3 rounded-card border border-neutral-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-neutral-950">Convidar para a equipe</h2>
      <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="email" className="text-xs font-medium text-neutral-950">
            E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="rounded-control border border-neutral-200 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="role" className="text-xs font-medium text-neutral-950">
            Papel
          </label>
          <select
            id="role"
            name="role"
            required
            defaultValue="viewer"
            className="rounded-control border border-neutral-200 px-3 py-2 text-sm"
          >
            {INVITABLE_ROLES.map((role) => (
              <option key={role} value={role}>
                {MEMBER_ROLE_LABELS[role]}
              </option>
            ))}
          </select>
        </div>
        <SubmitButton />
      </form>

      {state.error ? (
        <p role="alert" className="rounded-control bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      ) : null}

      {state.inviteLink ? (
        <div className="flex flex-col gap-2 rounded-control bg-primary-50 px-3 py-3 text-sm text-primary-900">
          <p>
            Convite criado para <strong>{state.inviteEmail}</strong>. Sem envio automático de e-mail configurado:
            copie o link e envie manualmente.
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={state.inviteLink}
              onFocus={(event) => event.currentTarget.select()}
              className="flex-1 rounded-control border border-primary-200 bg-white px-3 py-1.5 text-xs text-neutral-700"
            />
            <CopyLinkButton link={state.inviteLink} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
