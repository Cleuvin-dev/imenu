"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { uploadProductMediaAction } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-control bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Enviando…" : "Enviar mídia"}
    </button>
  );
}

export function MediaUploadForm({ productId }: { productId: string }) {
  const boundAction = uploadProductMediaAction.bind(null, productId);
  const [state, formAction] = useActionState(boundAction, {});

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-card border border-neutral-200 bg-white p-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="file" className="text-xs font-medium text-neutral-950">
          Imagem (JPEG/PNG/WebP até 5 MB) ou vídeo (MP4/WebM até 50 MB)
        </label>
        <input
          id="file"
          name="file"
          type="file"
          accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
          required
          className="text-sm"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="altText" className="text-xs font-medium text-neutral-950">
          Texto alternativo (opcional)
        </label>
        <input id="altText" name="altText" type="text" maxLength={200} className="rounded-control border border-neutral-200 px-3 py-2 text-sm" />
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
