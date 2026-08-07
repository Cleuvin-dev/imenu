"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { resetAdminPasswordAction, type ResetPasswordActionState } from "@/app/(platform)/admin-geral/administradores/actions";

const initialState: ResetPasswordActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="text-xs font-medium text-primary-700 hover:underline disabled:opacity-60">
      {pending ? "Redefinindo…" : "Redefinir senha"}
    </button>
  );
}

export function ResetPasswordButton({ userId }: { userId: string }) {
  const boundAction = resetAdminPasswordAction.bind(null, userId);
  const [state, formAction] = useActionState(boundAction, initialState);

  if (state.temporaryPassword) {
    return (
      <div className="flex flex-col gap-1 rounded-control border border-primary-200 bg-primary-50 px-2 py-1.5 text-xs text-primary-900">
        <p>Nova senha temporária (repasse por canal seguro):</p>
        <code className="rounded bg-white px-2 py-1 text-neutral-950">{state.temporaryPassword}</code>
      </div>
    );
  }

  return (
    <form action={formAction}>
      <SubmitButton />
      {state.error ? <p className="text-xs text-danger">{state.error}</p> : null}
    </form>
  );
}
