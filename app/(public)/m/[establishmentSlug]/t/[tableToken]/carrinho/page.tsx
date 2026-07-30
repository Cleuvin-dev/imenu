import type { Metadata } from "next";
import Link from "next/link";
import { getPublicMenu } from "@/modules/service-session/application/get-public-menu";
import { InvalidQrState, UnavailableState } from "../public-states";
import { CartClient } from "./cart-client";

export const metadata: Metadata = {
  title: "Carrinho — iMenu",
};

export default async function CarrinhoPage({
  params,
}: {
  params: Promise<{ establishmentSlug: string; tableToken: string }>;
}) {
  const { establishmentSlug, tableToken } = await params;
  const menu = await getPublicMenu(establishmentSlug, tableToken);

  if (!menu.valid) {
    return <InvalidQrState />;
  }

  if (!menu.access.allowed) {
    return <UnavailableState reason={menu.access.reason} />;
  }

  return (
    <main className="min-h-screen bg-neutral-50">
      <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3">
        <Link href={`/m/${establishmentSlug}/t/${tableToken}`} className="text-sm font-medium text-primary-700">
          ← Voltar ao cardápio
        </Link>
        <p className="text-sm text-neutral-600">Mesa {menu.table.name}</p>
      </header>
      <CartClient establishmentSlug={establishmentSlug} tableToken={tableToken} />
    </main>
  );
}
