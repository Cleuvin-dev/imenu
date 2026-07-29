/**
 * Datas são persistidas em UTC (timestamptz) e exibidas no fuso do
 * estabelecimento, padrão America/Sao_Paulo. Ver docs/06_ARQUITETURA_TECNICA.md.
 */

export const DEFAULT_TIMEZONE = "America/Sao_Paulo";

export function nowUtcIso(): string {
  return new Date().toISOString();
}

/** Retorna a data (YYYY-MM-DD) no fuso informado, usada como order_business_date. */
export function businessDateInTimezone(date: Date, timezone: string = DEFAULT_TIMEZONE): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date);
}

export function formatDateTimePtBr(iso: string, timezone: string = DEFAULT_TIMEZONE): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: timezone,
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function formatTimePtBr(iso: string, timezone: string = DEFAULT_TIMEZONE): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: timezone,
    timeStyle: "short",
  }).format(new Date(iso));
}
