"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { publishProductDetailAction } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-control bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Publicando…" : "Publicar produto"}
    </button>
  );
}

export function PublishButton({ productId }: { productId: string }) {
  const boundAction = publishProductDetailAction.bind(null, productId);
  const [state, formAction] = useActionState(boundAction, {});

  return (
    <form action={formAction} className="flex flex-col items-start gap-1">
      <SubmitButton />
      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
    </form>
  );
}
