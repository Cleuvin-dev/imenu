/** Carrinho local (client-side apenas); o pedido real é criado no servidor via POST /api/public/orders. */
export type CartItem = {
  id: string;
  productId: string;
  productSlug: string;
  name: string;
  unitPriceCents: number;
  quantity: number;
  optionIds: string[];
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

export function clearCart(establishmentSlug: string, tableToken: string): void {
  writeCart(establishmentSlug, tableToken, EMPTY_CART);
}

function clientRequestIdStorageKey(establishmentSlug: string, tableToken: string): string {
  return `imenu-cart-request-id:${establishmentSlug}:${tableToken}`;
}

/**
 * Um clientRequestId por carrinho, reaproveitado entre tentativas de envio
 * (retry/duplo clique) para que o servidor trate como a mesma operação
 * idempotente (AC-ORD-005). É descartado após o pedido ser criado com
 * sucesso — o próximo carrinho gera um novo.
 */
export function getOrCreateClientRequestId(establishmentSlug: string, tableToken: string): string {
  const key = clientRequestIdStorageKey(establishmentSlug, tableToken);
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const id = crypto.randomUUID();
  window.localStorage.setItem(key, id);
  return id;
}

export function clearClientRequestId(establishmentSlug: string, tableToken: string): void {
  window.localStorage.removeItem(clientRequestIdStorageKey(establishmentSlug, tableToken));
}
