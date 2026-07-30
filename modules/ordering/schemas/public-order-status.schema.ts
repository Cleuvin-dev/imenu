import { z } from "zod";

const optionSchema = z.object({
  groupName: z.string(),
  optionName: z.string(),
  priceDeltaCents: z.number(),
});

const itemSchema = z.object({
  name: z.string(),
  quantity: z.number(),
  notes: z.string().nullable(),
  unitTotalCents: z.number(),
  lineTotalCents: z.number(),
  options: z.array(optionSchema),
});

const timelineEntrySchema = z.object({
  toStatus: z.string(),
  createdAt: z.string(),
});

/** Formato de `get_public_order` (docs/08 §2 GET /api/public/orders/{trackingToken}). */
export const publicOrderStatusSchema = z.discriminatedUnion("valid", [
  z.object({ valid: z.literal(false) }),
  z.object({
    valid: z.literal(true),
    order: z.object({
      number: z.string(),
      status: z.string(),
      totalCents: z.number(),
      currency: z.string(),
      createdAt: z.string(),
      tableName: z.string().nullable(),
      rejectionReason: z.string().nullable(),
      cancellationReason: z.string().nullable(),
      items: z.array(itemSchema),
      timeline: z.array(timelineEntrySchema),
    }),
  }),
]);

export type PublicOrderStatus = z.infer<typeof publicOrderStatusSchema>;
