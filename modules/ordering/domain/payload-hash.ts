import { createHash } from "node:crypto";
import type { CreateOrderInput } from "@/modules/ordering/schemas/create-order.schema";

/**
 * Hash determinístico dos itens do pedido — usado só para detectar payload
 * divergente ao reaproveitar o mesmo clientRequestId (AC-ORD-006). Ordena
 * itens e opções para que a mesma seleção lógica gere sempre o mesmo hash,
 * independentemente da ordem em que o cliente montou o array.
 */
export function computeOrderPayloadHash(input: Pick<CreateOrderInput, "tableToken" | "items">): string {
  const normalizedItems = input.items
    .map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      selectedOptionIds: [...item.selectedOptionIds].sort(),
      notes: item.notes ?? "",
    }))
    .sort((a, b) => {
      if (a.productId !== b.productId) return a.productId < b.productId ? -1 : 1;
      return a.notes.localeCompare(b.notes);
    });

  const canonical = JSON.stringify({ tableToken: input.tableToken, items: normalizedItems });
  return createHash("sha256").update(canonical).digest("hex");
}
