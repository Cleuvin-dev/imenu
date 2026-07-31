import { z } from "zod";

export const requestTableBillSchema = z.object({
  tableToken: z.string().min(1),
  clientRequestId: z.uuid(),
});

export type RequestTableBillInput = z.infer<typeof requestTableBillSchema>;

const billRequestStatusEnum = z.enum(["requested", "acknowledged", "bill_delivered", "closed", "canceled"]);

/** Formato de `get_table_bill_status`/`request_table_bill` (docs/08 §2). Fail-closed: `valid:false` nunca revela detalhes. */
export const tableBillStatusSchema = z.discriminatedUnion("valid", [
  z.object({
    valid: z.literal(true),
    establishmentTradeName: z.string(),
    tableName: z.string(),
    session: z
      .object({
        status: z.enum(["open", "closed", "canceled"]),
        totalCents: z.number(),
        billRequest: z
          .object({
            status: billRequestStatusEnum,
            requestedAt: z.string(),
            cancellationReason: z.string().nullable(),
          })
          .nullable(),
      })
      .nullable(),
  }),
  z.object({ valid: z.literal(false) }),
]);

export type TableBillStatus = z.infer<typeof tableBillStatusSchema>;
export type BillRequestStatus = z.infer<typeof billRequestStatusEnum>;
