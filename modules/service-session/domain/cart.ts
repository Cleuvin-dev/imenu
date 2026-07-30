/**
 * Carrinho local (client-side apenas). A Fase 5 cria o pedido de verdade no
 * servidor; até lá isto é só um resumo informativo para o consumidor
 * (docs/12 Fase 4: "detalhe do produto e carrinho local").
 */
export type CartItem = {
  id: string;
  productId: string;
  productSlug: string;
  name: string;
  unitPriceCents: number;
  quantity: number;
  optionNames: string[];
  notes?: string;
};

export type Cart = {
  items: CartItem[];
};

const EMPTY_CART: Cart = { items: [] };

export function cartStorageKey(establishmentSlug: string, tableToken: string): string {
  return `imenu-cart:${establishmentSlug}:${tableToken}`;
}

export function readCart(establishmentSlug: string, tableToken: string): Cart {
  if (typeof window === "undefined") return EMPTY_CART;
  try {
    const raw = window.localStorage.getItem(cartStorageKey(establishmentSlug, tableToken));
    if (!raw) return EMPTY_CART;
    const parsed: unknown = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !Array.isArray((parsed as { items?: unknown }).items)
    ) {
      return EMPTY_CART;
    }
    return parsed as Cart;
  } catch {
    return EMPTY_CART;
  }
}

export function writeCart(establishmentSlug: string, tableToken: string, cart: Cart): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(cartStorageKey(establishmentSlug, tableToken), JSON.stringify(cart));
}

export function cartItemCount(cart: Cart): number {
  return cart.items.reduce((sum, item) => sum + item.quantity, 0);
}

export function cartSubtotalCents(cart: Cart): number {
  return cart.items.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0);
}
