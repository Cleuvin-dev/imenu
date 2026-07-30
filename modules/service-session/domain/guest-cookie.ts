/**
 * Constantes e geração de token do cookie de sessão anônima do consumidor
 * (docs/06 §5). Usado tanto pelo middleware (Edge) quanto por Server
 * Components/Actions (Node) — só Web Crypto API, sem `node:crypto`.
 */
export const GUEST_SESSION_COOKIE = "imenu_guest_session";
export const GUEST_SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

export function generateOpaqueToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
