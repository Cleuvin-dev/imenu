import { z } from "zod";

/**
 * `searchParams`/`FormData` sempre entregam campos vazios como string `""`,
 * nunca `undefined` — `.optional()` sozinho só aceita `undefined`, então um
 * filtro opcional não preenchido (ex.: `?status=`) quebra o parse em vez de
 * ser tratado como ausente. Mesmo problema documentado em `lib/env`
 * (status/DECISION_LOG.md, D-018), reaproveitado aqui para schemas de
 * filtro que recebem `searchParams` bruto.
 */
export function optionalFromEmpty<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess((value) => (value === "" ? undefined : value), schema.optional());
}
