import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { tableBillStatusSchema, type TableBillStatus } from "@/modules/service-session/schemas/bill-request.schema";

/**
 * Leitura pública do status da conta (docs/08 §2). Fail-closed: qualquer
 * erro ou limite excedido vira `{ valid: false }`, mesmo padrão de
 * `get_public_order`/`get_public_menu` (docs/11 AC-PUB-002).
 */
export async function getTableBillStatus(tableToken: string): Promise<TableBillStatus> {
  const rateLimit = await checkRateLimit({
    key: `bill-status:${tableToken}`,
    limit: 60,
    windowSeconds: 60,
  });
  if (!rateLimit.allowed) {
    return { valid: false };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_table_bill_status", { p_table_token: tableToken });

  if (error) {
    return { valid: false };
  }

  const parsed = tableBillStatusSchema.safeParse(data);
  if (!parsed.success) {
    return { valid: false };
  }

  return parsed.data;
}
