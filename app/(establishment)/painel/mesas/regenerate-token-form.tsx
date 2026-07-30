"use client";

export function RegenerateTokenForm({ action }: { action: () => Promise<void> }) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm("Regenerar o QR desta mesa? O código atual para de funcionar imediatamente.")) {
          event.preventDefault();
        }
      }}
    >
      <button type="submit" className="text-xs font-medium text-danger hover:underline">
        Regenerar QR
      </button>
    </form>
  );
}
