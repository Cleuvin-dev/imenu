"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/money";
import {
  readCart,
  writeCart,
  clearCart,
  cartSubtotalCents,
  getOrCreateClientRequestId,
  clearClientRequestId,
  type Cart,
} from "@/modules/service-session/domain/cart";

export function CartClient({
  establishmentSlug,
  tableToken,
  canOrder,
  blockedReason,
}: {
  establishmentSlug: string;
  tableToken: string;
  canOrder: boolean;
  blockedReason: string | null;
}) {
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    // localStorage não existe durante o SSR; ler aqui (depois da hidratação)
    // evita divergir do HTML renderizado no servidor.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCart(readCart(establishmentSlug, tableToken));
  }, [establishmentSlug, tableToken]);

  function updateQuantity(itemId: string, quantity: number) {
    setCart((prev) => {
      if (!prev) return prev;
      const next: Cart = {
        items: prev.items
          .map((item) => (item.id === itemId ? { ...item, quantity } : item))
          .filter((item) => item.quantity > 0),
      };
      writeCart(establishmentSlug, tableToken, next);
      return next;
    });
  }

  function removeItem(itemId: string) {
    setCart((prev) => {
      if (!prev) return prev;
      const next: Cart = { items: prev.items.filter((item) => item.id !== itemId) };
      writeCart(establishmentSlug, tableToken, next);
      return next;
    });
  }

  async function handleSubmitOrder() {
    if (!cart || cart.items.length === 0) return;

    setSubmitting(true);
    setError(null);

    const clientRequestId = getOrCreateClientRequestId(establishmentSlug, tableToken);
    const subtotal = cartSubtotalCents(cart);

    try {
      const response = await fetch("/api/public/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableToken,
          clientRequestId,
          expectedTotalCents: subtotal,
          items: cart.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            selectedOptionIds: item.optionIds,
            notes: item.notes,
          })),
        }),
      });

      const payload: { order?: { trackingToken: string }; message?: string } = await response.json();

      if (!response.ok || !payload.order) {
        setError(payload.message ?? "Não foi possível enviar o pedido. Tente novamente.");
        setSubmitting(false);
        requestAnimationFrame(() => errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
        return;
      }

      clearClientRequestId(establishmentSlug, tableToken);
      clearCart(establishmentSlug, tableToken);
      router.push(`/pedido/${payload.order.trackingToken}`);
    } catch {
      setError("Não foi possível enviar o pedido. Verifique sua conexão e tente novamente.");
      setSubmitting(false);
      requestAnimationFrame(() => errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
    }
  }

  if (!cart) {
    return null;
  }

  if (cart.items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
        <p className="text-sm text-neutral-600">Seu carrinho está vazio.</p>
        <Link
          href={`/m/${establishmentSlug}/t/${tableToken}`}
          className="rounded-control bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700"
        >
          Ver cardápio
        </Link>
      </div>
    );
  }

  const subtotal = cartSubtotalCents(cart);
  const canSubmit = canOrder && !submitting;

  return (
    <div className="flex flex-col gap-4 px-4 pb-32 pt-4">
      <h1 className="text-lg font-semibold text-neutral-950">Seu pedido</h1>

      {!canOrder ? (
        <p className="rounded-control bg-warning/10 px-3 py-2 text-sm text-warning">
          {blockedReason === "closed"
            ? "Fora do horário de funcionamento — pedidos indisponíveis agora."
            : "Pedidos pausados temporariamente pela equipe do local."}
        </p>
      ) : null}

      <div className="flex flex-col gap-3">
        {cart.items.map((item) => (
          <div key={item.id} className="rounded-card border border-neutral-200 bg-white p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium text-neutral-950">{item.name}</p>
                {item.optionNames.length > 0 ? (
                  <p className="text-xs text-neutral-600">{item.optionNames.join(", ")}</p>
                ) : null}
                {item.notes ? <p className="text-xs italic text-neutral-600">&ldquo;{item.notes}&rdquo;</p> : null}
              </div>
              <p className="font-semibold text-neutral-950">{formatMoney(item.unitPriceCents * item.quantity)}</p>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  className="h-7 w-7 rounded-control border border-neutral-200 text-neutral-700"
                  aria-label={`Diminuir quantidade de ${item.name}`}
                >
                  −
                </button>
                <span className="w-6 text-center text-sm">{item.quantity}</span>
                <button
                  type="button"
                  onClick={() => updateQuantity(item.id, Math.min(20, item.quantity + 1))}
                  className="h-7 w-7 rounded-control border border-neutral-200 text-neutral-700"
                  aria-label={`Aumentar quantidade de ${item.name}`}
                >
                  +
                </button>
              </div>
              <button
                type="button"
                onClick={() => removeItem(item.id)}
                className="text-xs font-medium text-danger hover:underline"
              >
                Remover
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-card border border-neutral-200 bg-white p-4">
        <div className="flex items-center justify-between text-sm text-neutral-700">
          <span>Subtotal</span>
          <span className="font-semibold text-neutral-950">{formatMoney(subtotal)}</span>
        </div>
        <p className="mt-2 text-xs text-neutral-600">
          O pagamento é feito diretamente com a equipe do estabelecimento, fora do iMenu. Este total é apenas
          informativo e pode ser recalculado pelo servidor ao confirmar.
        </p>
      </div>

      {error ? (
        <p ref={errorRef} role="alert" className="rounded-control bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 border-t border-neutral-200 bg-white p-4">
        <button
          type="button"
          onClick={handleSubmitOrder}
          disabled={!canSubmit}
          className="w-full rounded-control bg-primary-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Enviando…" : "Enviar pedido"}
        </button>
      </div>
    </div>
  );
}
