"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { publishProductAction } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-chip bg-primary-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Publicando…" : "Publicar"}
    </button>
  );
}

export function PublishButton({ productId }: { productId: string }) {
  const boundAction = async (_prevState: { error?: string }, _formData: FormData) => publishProductAction(productId);
  const [state, formAction] = useActionState(boundAction, {});

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <SubmitButton />
      {state.error ? <p className="text-xs text-danger">{state.error}</p> : null}
    </form>
  );
}
