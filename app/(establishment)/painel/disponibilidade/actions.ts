"use server";

import { resolveActiveEstablishment } from "@/modules/tenancy/application/resolve-active-establishment";
import { listProducts } from "@/modules/catalog/application/products";

export type AvailabilityProduct = {
  id: string;
  name: string;
  is_available: boolean;
  category: { name: string } | null;
};

/** Snapshot usado pelo react-query da disponibilidade rápida (docs/04 O-05). */
export async function getAvailabilityBoardAction(): Promise<AvailabilityProduct[]> {
  const resolution = await resolveActiveEstablishment();
  if (resolution.status !== "active") {
    return [];
  }

  const products = await listProducts(resolution.establishment.establishmentId);
  return (products ?? [])
    .filter((product) => product.status === "published")
    .map((product) => ({
      id: product.id,
      name: product.name,
      is_available: product.is_available,
      category: product.category,
    }));
}
