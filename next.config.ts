import type { NextConfig } from "next";

/**
 * Headers de segurança globais (docs/16 §2, docs/13 §6). CSP usa
 * `'unsafe-inline'` em `script-src`/`style-src` porque o App Router do
 * Next.js ainda depende de scripts de hidratação sem nonce nesta versão —
 * simplificação pragmática registrada em status/DECISION_LOG.md; migrar
 * para CSP com nonce por requisição fica como melhoria futura (Fase 9,
 * D-039). `connect-src`/`img-src` liberam `*.supabase.co` (REST/Realtime
 * via WebSocket e Storage) porque o subdomínio muda entre projetos
 * dev/staging/produção.
 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "media-src 'self' https://*.supabase.co",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

export default nextConfig;
