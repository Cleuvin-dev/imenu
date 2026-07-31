"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAvailabilityBoardAction, type AvailabilityProduct } from "@/app/(establishment)/painel/disponibilidade/actions";
import { setProductAvailabilityAction } from "@/app/(establishment)/painel/cardapio/produtos/actions";
import { useRealtimeInvalidate } from "@/modules/operations/application/use-realtime-invalidate";
import type { Database } from "@/lib/supabase/database-types";

type MemberRole = Database["public"]["Enums"]["member_role"];

const CAN_TOGGLE_ROLES: readonly MemberRole[] = ["owner", "manager", "menu_editor", "kitchen", "cashier"];

export function AvailabilityBoard({
  establishmentId,
  role,
  initialProducts,
}: {
  establishmentId: string;
  role: MemberRole;
  initialProducts: AvailabilityProduct[];
}) {
  const queryKey = useMemo(() => ["availability-board", establishmentId], [establishmentId]);
  const { data: products } = useQuery({
    queryKey,
    queryFn: () => getAvailabilityBoardAction(),
    initialData: initialProducts,
    refetchInterval: 15_000,
  });

  useRealtimeInvalidate({ table: "products", establishmentId, queryKey });

  const canToggle = CAN_TOGGLE_ROLES.includes(role);

  if (products.length === 0) {
    return <p className="text-sm text-neutral-600">Nenhum produto publicado ainda.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {products.map((product) => (
        <li
          key={product.id}
          className="flex items-center justify-between gap-3 rounded-card border border-neutral-200 bg-white p-3"
        >
          <div>
            <p className="font-medium text-neutral-950">{product.name}</p>
            <p className="text-xs text-neutral-600">{product.category?.name ?? "—"}</p>
          </div>
          {canToggle ? (
            <form action={setProductAvailabilityAction.bind(null, product.id, !product.is_available)}>
              <button
                type="submit"
                className={`rounded-control px-3 py-2 text-xs font-semibold transition ${
                  product.is_available
                    ? "border border-neutral-200 text-neutral-700 hover:border-primary-600"
                    : "bg-primary-600 text-white hover:bg-primary-700"
                }`}
              >
                {product.is_available ? "Marcar esgotado" : "Marcar disponível"}
              </button>
            </form>
          ) : (
            <span
              className={`rounded-chip px-2 py-1 text-xs font-medium ${
                product.is_available ? "bg-success/10 text-success" : "bg-neutral-100 text-neutral-600"
              }`}
            >
              {product.is_available ? "Disponível" : "Esgotado"}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
