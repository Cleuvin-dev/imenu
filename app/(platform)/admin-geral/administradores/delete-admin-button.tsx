"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { deleteAdminAction, type DeleteAdminActionState } from "@/app/(platform)/admin-geral/administradores/actions";

const initialState: DeleteAdminActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="text-xs font-medium text-danger hover:underline disabled:opacity-60">
      {pending ? "Removendo…" : "Excluir"}
    </button>
  );
}

export function DeleteAdminButton({ userId, displayName }: { userId: string; displayName: string }) {
  const boundAction = deleteAdminAction.bind(null, userId);
  const [state, formAction] = useActionState(boundAction, initialState);

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!window.confirm(`Remover definitivamente o acesso de "${displayName}"? Essa ação não pode ser desfeita.`)) {
          event.preventDefault();
        }
      }}
    >
      <SubmitButton />
      {state.error ? <p className="text-xs text-danger">{state.error}</p> : null}
    </form>
  );
}
