/**
 * Decide quais pedidos pendentes ainda não geraram alerta sonoro/visual.
 * Nunca alerta de novo para um pedido já visto (docs/08 §8: "não tocar
 * novamente ao refetch do mesmo pedido").
 */
export function findUnseenPendingOrderIds(
  orders: readonly { id: string; status: string }[],
  alreadySeenIds: ReadonlySet<string>,
): string[] {
  return orders.filter((order) => order.status === "pending" && !alreadySeenIds.has(order.id)).map((order) => order.id);
}
