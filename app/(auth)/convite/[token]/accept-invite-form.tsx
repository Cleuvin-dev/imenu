"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { acceptInviteAction, type AcceptInviteActionState } from "@/app/(auth)/convite/[token]/actions";

const initialState: AcceptInviteActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex w-full items-center justify-center rounded-control bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Aceitando…" : "Aceitar convite"}
    </button>
  );
}

export function AcceptInviteForm({ token }: { token: string }) {
  const boundAction = acceptInviteAction.bind(null, token);
  const [state, formAction] = useActionState(boundAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {state.error ? (
        <p role="alert" className="rounded-control bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      <SubmitButton />
    </form>
  );
}
