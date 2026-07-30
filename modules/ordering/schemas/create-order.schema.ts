import { z } from "zod";

export const createOrderItemSchema = z.object({
  productId: z.uuid(),
  quantity: z.number().int().min(1).max(20),
  selectedOptionIds: z.array(z.uuid()).max(50).default([]),
  notes: z.string().trim().max(300).optional(),
});

export const createOrderSchema = z.object({
  tableToken: z.string().min(1),
  clientRequestId: z.uuid(),
  expectedTotalCents: z.number().int().min(0).optional(),
  items: z.array(createOrderItemSchema).min(1).max(50),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type CreateOrderItemInput = z.infer<typeof createOrderItemSchema>;

/** Formato de `create_public_order`/RPC de retomada idempotente (docs/08 §2). */
export const publicOrderCreatedSchema = z.object({
  trackingToken: z.string(),
  number: z.string(),
  status: z.string(),
  totalCents: z.number(),
  currency: z.string(),
  createdAt: z.string(),
});

export type PublicOrderCreated = z.infer<typeof publicOrderCreatedSchema>;
