import { z } from "zod";
import { optionalFromEmpty } from "@/lib/validation/empty-to-undefined";

export const auditFilterSchema = z.object({
  actorEmail: optionalFromEmpty(z.string().trim().max(160)),
  action: optionalFromEmpty(z.string().trim().max(80)),
  resourceType: optionalFromEmpty(z.string().trim().max(80)),
  establishmentId: optionalFromEmpty(z.uuid()),
  dateFrom: optionalFromEmpty(z.string().trim().max(20)),
  dateTo: optionalFromEmpty(z.string().trim().max(20)),
});

export type AuditFilterInput = z.infer<typeof auditFilterSchema>;
