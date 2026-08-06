import "server-only";
import { z } from "zod";
export { getPublicEnv, type PublicEnv } from "@/lib/env/public";

/**
 * Variáveis opcionais chegam como string vazia quando declaradas mas não
 * preenchidas em `.env.local` (ex.: `EMAIL_FROM=`) — `.optional()` sozinho só
 * aceita `undefined`, não `""`. Sem isso, `z.url().optional()` rejeitaria uma
 * URL opcional vazia como inválida em vez de tratá-la como ausente.
 */
const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);
const optionalString = () => z.preprocess(emptyToUndefined, z.string().optional());
const optionalUrl = () => z.preprocess(emptyToUndefined, z.url().optional());

const serverEnvSchema = z.object({
  APP_ENV: z.enum(["local", "staging", "production"]).default("local"),
  APP_TIMEZONE: z.string().min(1).default("America/Sao_Paulo"),
  NEXT_PUBLIC_APP_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  // Deliberadamente opcional aqui: só é exigida no ponto de uso
  // (lib/supabase/admin.ts), para não derrubar todo o app enquanto o dono do
  // produto não a obtiver no painel do Supabase (ver status/DECISION_LOG.md).
  SUPABASE_SERVICE_ROLE_KEY: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  CRON_SECRET: z.string().min(16),
  ANONYMOUS_SESSION_PEPPER: z.string().min(16),
  INVITE_TOKEN_PEPPER: z.string().min(16),
  ORDER_TRACKING_TOKEN_PEPPER: z.string().min(16),
  IP_HASH_PEPPER: z.string().min(16),
  RATE_LIMIT_PROVIDER: z.enum(["memory", "upstash"]).default("memory"),
  UPSTASH_REDIS_REST_URL: optionalUrl(),
  UPSTASH_REDIS_REST_TOKEN: optionalString(),
  EMAIL_PROVIDER: z.enum(["console", "resend"]).default("console"),
  EMAIL_FROM: optionalString(),
  EMAIL_API_KEY: optionalString(),
  SENTRY_DSN: optionalString(),
  NEXT_PUBLIC_SENTRY_DSN: optionalString(),
  ENABLE_EMAIL_DELIVERY: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  ENABLE_EXTERNAL_BILLING: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  ENABLE_ERROR_REPORTING: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedEnv: ServerEnv | undefined;

/**
 * Valida o ambiente uma única vez no boot do servidor. Deve ser chamada
 * apenas em código server-side; nunca importar em componentes de cliente.
 */
export function getServerEnv(): ServerEnv {
  if (cachedEnv) return cachedEnv;

  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Configuração de ambiente inválida: ${issues}`);
  }

  if (parsed.data.RATE_LIMIT_PROVIDER === "upstash") {
    if (!parsed.data.UPSTASH_REDIS_REST_URL || !parsed.data.UPSTASH_REDIS_REST_TOKEN) {
      throw new Error(
        "RATE_LIMIT_PROVIDER=upstash exige UPSTASH_REDIS_REST_URL e UPSTASH_REDIS_REST_TOKEN.",
      );
    }
  }

  if (parsed.data.ENABLE_EMAIL_DELIVERY && parsed.data.EMAIL_PROVIDER === "console") {
    throw new Error(
      "ENABLE_EMAIL_DELIVERY=true exige EMAIL_PROVIDER configurado com um provedor real.",
    );
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}

