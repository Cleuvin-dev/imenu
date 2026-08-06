import { z } from "zod";

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const timeField = z.string().regex(TIME_PATTERN, "Use o formato HH:MM.").nullable();

export const upsertBusinessHourSchema = z
  .object({
    weekday: z.number().int().min(0, "Dia da semana inválido.").max(6, "Dia da semana inválido."),
    isClosed: z.boolean(),
    opensAt: timeField,
    closesAt: timeField,
  })
  .refine((data) => data.isClosed || (data.opensAt !== null && data.closesAt !== null && data.opensAt < data.closesAt), {
    message: "Informe abertura e fechamento válidos, com o fechamento depois da abertura.",
    path: ["opensAt"],
  });

export type UpsertBusinessHourInput = z.infer<typeof upsertBusinessHourSchema>;

export const upsertBusinessHourExceptionSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use o formato AAAA-MM-DD."),
    isClosed: z.boolean(),
    opensAt: timeField,
    closesAt: timeField,
    note: z.string().trim().max(200, "Nota muito longa.").optional(),
  })
  .refine((data) => data.isClosed || (data.opensAt !== null && data.closesAt !== null && data.opensAt < data.closesAt), {
    message: "Informe abertura e fechamento válidos, com o fechamento depois da abertura.",
    path: ["opensAt"],
  });

export type UpsertBusinessHourExceptionInput = z.infer<typeof upsertBusinessHourExceptionSchema>;
