import type { Metadata } from "next";
import { getPublicOrderStatus } from "@/modules/ordering/application/get-public-order";
import { OrderTrackingClient } from "./order-tracking-client";

export const metadata: Metadata = {
  title: "Acompanhar pedido — iMenu",
};

export default async function PedidoPublicoPage({
  params,
}: {
  params: Promise<{ trackingToken: string }>;
}) {
  const { trackingToken } = await params;
  const status = await getPublicOrderStatus(trackingToken);

  if (!status.valid) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-neutral-50 px-6 text-center">
        <span className="rounded-chip bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700">iMenu</span>
        <h1 className="text-xl font-semibold text-neutral-950">Pedido não encontrado</h1>
        <p className="max-w-sm text-sm text-neutral-600">
          Este link de acompanhamento não é válido ou expirou. Volte ao cardápio e fale com a equipe do local se
          precisar confirmar seu pedido.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-6">
      <OrderTrackingClient trackingToken={trackingToken} initialStatus={status} />
    </main>
  );
}
