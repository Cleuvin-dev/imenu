import { ACCESS_BLOCK_REASON_LABELS } from "@/modules/billing/domain/labels";

/** QR inválido, expirado ou mesa desativada — nunca revela IDs (docs/11 AC-PUB-002). */
export function InvalidQrState() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-neutral-50 px-6 text-center">
      <span className="rounded-chip bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700">iMenu</span>
      <h1 className="text-xl font-semibold text-neutral-950">QR Code inválido</h1>
      <p className="max-w-sm text-sm text-neutral-600">
        Este código não é válido ou não está mais ativo. Peça à equipe do local um QR Code atualizado da mesa.
      </p>
    </main>
  );
}

/** Estabelecimento suspenso/inativo/sem assinatura — mensagem neutra, sem mencionar inadimplência. */
export function UnavailableState({ reason }: { reason: string | null }) {
  const message = (reason && ACCESS_BLOCK_REASON_LABELS[reason]) ?? ACCESS_BLOCK_REASON_LABELS.other;
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-neutral-50 px-6 text-center">
      <span className="rounded-chip bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700">iMenu</span>
      <h1 className="text-xl font-semibold text-neutral-950">Cardápio temporariamente indisponível</h1>
      <p className="max-w-sm text-sm text-neutral-600">
        {reason === "overdue" || reason === "manual" || reason === "fraud" || reason === "contract_end"
          ? "O cardápio deste estabelecimento está temporariamente indisponível. Procure a equipe do local."
          : message}
      </p>
    </main>
  );
}
