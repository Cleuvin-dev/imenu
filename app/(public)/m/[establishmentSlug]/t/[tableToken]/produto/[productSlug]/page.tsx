import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicMenu } from "@/modules/service-session/application/get-public-menu";
import { getPublicEnv } from "@/lib/env";
import { InvalidQrState, UnavailableState } from "../../public-states";
import { ProductDetailClient } from "./product-detail-client";

export const metadata: Metadata = {
  title: "Produto — iMenu",
};

export default async function ProdutoPublicoPage({
  params,
}: {
  params: Promise<{ establishmentSlug: string; tableToken: string; productSlug: string }>;
}) {
  const { establishmentSlug, tableToken, productSlug } = await params;
  const menu = await getPublicMenu(establishmentSlug, tableToken);

  if (!menu.valid) {
    return <InvalidQrState />;
  }

  if (!menu.access.allowed) {
    return <UnavailableState reason={menu.access.reason} />;
  }

  const product = menu.categories.flatMap((category) => category.products).find((p) => p.slug === productSlug);

  if (!product) {
    notFound();
  }

  const env = getPublicEnv();
  const canOrder = menu.operation.isOpenNow && menu.operation.acceptingOrders;
  const blockedReason = !menu.operation.isOpenNow ? "closed" : !menu.operation.acceptingOrders ? "paused" : null;

  return (
    <main className="min-h-screen bg-white">
      <ProductDetailClient
        product={product}
        establishmentSlug={establishmentSlug}
        tableToken={tableToken}
        supabaseUrl={env.NEXT_PUBLIC_SUPABASE_URL}
        canOrder={canOrder}
        blockedReason={blockedReason}
      />
    </main>
  );
}
