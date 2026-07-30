import { z } from "zod";

const mediaSchema = z.object({
  kind: z.enum(["image", "video"]),
  storagePath: z.string(),
  posterPath: z.string().nullable(),
  altText: z.string().nullable(),
  isPrimary: z.boolean(),
});

const optionSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  priceDeltaCents: z.number(),
});

const optionGroupSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  minSelect: z.number(),
  maxSelect: z.number(),
  options: z.array(optionSchema),
});

const productSchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  name: z.string(),
  shortDescription: z.string().nullable(),
  description: z.string().nullable(),
  ingredients: z.array(z.string()),
  allergens: z.array(z.string()),
  nutrition: z.unknown().nullable(),
  basePriceCents: z.number(),
  isAvailable: z.boolean(),
  media: z.array(mediaSchema),
  optionGroups: z.array(optionGroupSchema),
});

const categorySchema = z.object({
  id: z.uuid(),
  name: z.string(),
  products: z.array(productSchema),
});

const accessSchema = z.object({
  allowed: z.boolean(),
  reason: z.string().nullable(),
});

const operationSchema = z.object({
  isOpenNow: z.boolean(),
  acceptingOrders: z.boolean(),
});

export const publicMenuSchema = z.discriminatedUnion("valid", [
  z.object({ valid: z.literal(false) }),
  z.object({
    valid: z.literal(true),
    establishment: z.object({
      id: z.uuid(),
      tradeName: z.string(),
      slug: z.string(),
      logoPath: z.string().nullable(),
      coverPath: z.string().nullable(),
      timezone: z.string(),
    }),
    table: z.object({ id: z.uuid(), name: z.string() }),
    access: accessSchema,
    operation: operationSchema,
    categories: z.array(categorySchema),
  }),
]);

export type PublicMenu = z.infer<typeof publicMenuSchema>;
export type PublicMenuCategory = z.infer<typeof categorySchema>;
export type PublicMenuProduct = z.infer<typeof productSchema>;
