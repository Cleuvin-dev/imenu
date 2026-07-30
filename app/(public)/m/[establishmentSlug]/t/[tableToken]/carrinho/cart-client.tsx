"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatMoney } from "@/lib/money";
import { readCart, writeCart, cartSubtotalCents, type Cart } from "@/modules/service-session/domain/cart";

export function CartClient({ establishmentSlug, tableToken }: { establishmentSlug: string; tableToken: string }) {
  const [cart, setCart] = useState<Cart | null>(null);

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

  return (
    <div className="flex flex-col gap-4 px-4 pb-32 pt-4">
      <h1 className="text-lg font-semibold text-neutral-950">Seu pedido</h1>
      <div className="flex flex-col gap-3">
        {cart.items.map((item) => (
          <div key={item.id} className="rounded-card border border-neutral-200 bg-white p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium text-neutral-950">{item.name}</p>
                {item.optionNames.length > 0 ? (
                  <p className="text-xs text-neutral-600">{item.optionNames.join(", ")}</p>
                ) : null}
                {item.notes ? <p className="text-xs italic text-neutral-500">&ldquo;{item.notes}&rdquo;</p> : null}
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
        <p className="mt-2 text-xs text-neutral-500">
          O pagamento é feito diretamente com a equipe do estabelecimento, fora do iMenu. Este total é apenas
          informativo e pode ser recalculado pelo servidor ao confirmar.
        </p>
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-neutral-200 bg-white p-4">
        <button
          type="button"
          disabled
          title="O envio de pedidos chega na próxima fase do MVP."
          className="w-full cursor-not-allowed rounded-control bg-neutral-200 px-4 py-3 text-sm font-semibold text-neutral-500"
        >
          Enviar pedido (em breve)
        </button>
      </div>
    </div>
  );
}
