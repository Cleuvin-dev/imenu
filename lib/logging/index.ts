import "server-only";

/**
 * Logger estruturado mínimo (docs/13 §6): uma linha JSON por evento em
 * stdout/stderr — funciona direto com os log drains da Vercel, sem
 * depender de um provedor externo configurado (nenhum DSN de observabilidade
 * está configurado ainda; ver ENABLE_ERROR_REPORTING em lib/env). Nunca
 * loga segredo, token, senha ou corpo completo de requisição — só campos
 * estruturados explícitos.
 */
type LogLevel = "info" | "warn" | "error";

export type LogFields = {
  requestId?: string;
  route?: string;
  event?: string;
  [key: string]: unknown;
};

function write(level: LogLevel, message: string, fields: LogFields = {}): void {
  const line = JSON.stringify({
    level,
    message,
    timestamp: new Date().toISOString(),
    ...fields,
  });

  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  info: (message: string, fields?: LogFields) => write("info", message, fields),
  warn: (message: string, fields?: LogFields) => write("warn", message, fields),
  error: (message: string, fields?: LogFields) => write("error", message, fields),
};
