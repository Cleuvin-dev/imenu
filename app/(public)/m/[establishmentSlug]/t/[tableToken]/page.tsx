import type { Metadata } from "next";
import { getPublicMenu } from "@/modules/service-session/application/get-public-menu";
import { getPublicEnv } from "@/lib/env";
import { buildPublicMediaUrl } from "@/modules/media/domain/public-url";
import { InvalidQrState, UnavailableState } from "./public-states";
import { MenuBrowser } from "./menu-browser";

export const metadata: Metadata = {
  title: "Cardápio — iMenu",
};

export default async function CardapioPublicoPage({
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

  const { establishment, table, operation, categories } = menu;
  const env = getPublicEnv();
  const coverUrl = establishment.coverPath
    ? buildPublicMediaUrl(env.NEXT_PUBLIC_SUPABASE_URL, "brand-media", establishment.coverPath)
    : null;

  return (
    <main className="min-h-screen bg-neutral-50">
      <header className="flex flex-col gap-2 border-b border-neutral-200 bg-white px-4 py-4">
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverUrl} alt="" className="h-28 w-full rounded-card object-cover" />
        ) : null}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-neutral-950">{establishment.tradeName}</h1>
            <p className="text-sm text-neutral-600">{table.name}</p>
          </div>
        </div>
        {!operation.isOpenNow ? (
          <p className="rounded-control bg-warning/10 px-3 py-2 text-sm text-warning">
            Estabelecimento fechado no momento. Você pode ver o cardápio, mas não é possível enviar pedidos agora.
          </p>
        ) : !operation.acceptingOrders ? (
          <p className="rounded-control bg-warning/10 px-3 py-2 text-sm text-warning">
            Pedidos pausados temporariamente pela equipe do local.
          </p>
        ) : null}
      </header>

      <MenuBrowser
        categories={categories}
        establishmentSlug={establishmentSlug}
        tableToken={tableToken}
        supabaseUrl={env.NEXT_PUBLIC_SUPABASE_URL}
      />
    </main>
  );
}
