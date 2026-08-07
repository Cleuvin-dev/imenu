"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { signUpInviteAction, type SignUpInviteActionState } from "@/app/(auth)/convite/[token]/actions";

const initialState: SignUpInviteActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex w-full items-center justify-center rounded-control bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Criando conta…" : "Criar conta e aceitar convite"}
    </button>
  );
}

export function SignUpInviteForm({ token, email }: { token: string; email: string }) {
  const boundAction = signUpInviteAction.bind(null, token);
  const [state, formAction] = useActionState(boundAction, initialState);

  if (state.needsEmailConfirmation) {
    return (
      <p className="rounded-control bg-primary-50 px-3 py-2 text-sm text-primary-900">
        Conta criada. Confirme seu e-mail e depois entre normalmente para aceitar o convite.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3" noValidate>
      <input type="hidden" name="email" value={email} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="displayName" className="text-sm font-medium text-neutral-950">
          Seu nome
        </label>
        <input
          id="displayName"
          name="displayName"
          type="text"
          required
          maxLength={120}
          className="rounded-control border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-950 outline-none focus:border-primary-600"
        />
        {state.fieldErrors?.displayName ? (
          <p className="text-sm text-danger">{state.fieldErrors.displayName[0]}</p>
        ) : null}
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium text-neutral-950">
          Crie uma senha
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          className="rounded-control border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-950 outline-none focus:border-primary-600"
        />
        {state.fieldErrors?.password ? <p className="text-sm text-danger">{state.fieldErrors.password[0]}</p> : null}
      </div>
      <p className="text-xs text-neutral-600">
        Conta será criada com o e-mail <strong>{email}</strong>, o mesmo do convite.
      </p>
      {state.error ? (
        <p role="alert" className="rounded-control bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      <SubmitButton />
    </form>
  );
}
