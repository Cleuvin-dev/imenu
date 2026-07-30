"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatMoney } from "@/lib/money";
import { buildPublicMediaUrl } from "@/modules/media/domain/public-url";
import { readCart, cartItemCount, cartSubtotalCents } from "@/modules/service-session/domain/cart";
import type { PublicMenuCategory } from "@/modules/service-session/schemas/public-menu.schema";

export function MenuBrowser({
  categories,
  establishmentSlug,
  tableToken,
  supabaseUrl,
}: {
  categories: PublicMenuCategory[];
  establishmentSlug: string;
  tableToken: string;
  supabaseUrl: string;
}) {
  const [query, setQuery] = useState("");
  const [itemCount, setItemCount] = useState(0);
  const [subtotalCents, setSubtotalCents] = useState(0);

  useEffect(() => {
    // localStorage não existe durante o SSR; ler e aplicar aqui (depois da
    // hidratação) evita divergir do HTML renderizado no servidor.
    const cart = readCart(establishmentSlug, tableToken);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItemCount(cartItemCount(cart));
    setSubtotalCents(cartSubtotalCents(cart));
  }, [establishmentSlug, tableToken]);

  const normalizedQuery = query.trim().toLowerCase();

  const filteredCategories = useMemo(() => {
    if (!normalizedQuery) return categories;
    return categories
      .map((category) => ({
        ...category,
        products: category.products.filter(
          (product) =>
            product.name.toLowerCase().includes(normalizedQuery) ||
            (product.shortDescription ?? "").toLowerCase().includes(normalizedQuery),
        ),
      }))
      .filter((category) => category.products.length > 0);
  }, [categories, normalizedQuery]);

  return (
    <div className="flex flex-col gap-4 pb-24">
      <div className="sticky top-0 z-10 flex flex-col gap-3 bg-neutral-50 px-4 pt-3 pb-2">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar no cardápio"
          aria-label="Buscar no cardápio"
          className="rounded-control border border-neutral-200 bg-white px-3 py-2 text-sm"
        />
        {filteredCategories.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto">
            {filteredCategories.map((category) => (
              <a
                key={category.id}
                href={`#categoria-${category.id}`}
                className="whitespace-nowrap rounded-chip border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700"
              >
                {category.name}
              </a>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-6 px-4">
        {filteredCategories.length === 0 ? (
          <p className="py-12 text-center text-sm text-neutral-600">Nenhum item encontrado.</p>
        ) : (
          filteredCategories.map((category) => (
            <section key={category.id} id={`categoria-${category.id}`} className="flex flex-col gap-3">
              <h2 className="text-base font-semibold text-neutral-950">{category.name}</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {category.products.map((product) => {
                  const primaryImage = product.media.find((m) => m.kind === "image");
                  return (
                    <Link
                      key={product.id}
                      href={`/m/${establishmentSlug}/t/${tableToken}/produto/${product.slug}`}
                      className="flex gap-3 rounded-card border border-neutral-200 bg-white p-3 transition hover:border-primary-600"
                    >
                      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-control bg-neutral-100">
                        {primaryImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={buildPublicMediaUrl(supabaseUrl, "menu-media", primaryImage.storagePath)}
                            alt={primaryImage.altText ?? product.name}
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                      </div>
                      <div className="flex flex-1 flex-col gap-1">
                        <p className="font-medium text-neutral-950">{product.name}</p>
                        {product.shortDescription ? (
                          <p className="line-clamp-2 text-xs text-neutral-600">{product.shortDescription}</p>
                        ) : null}
                        <div className="mt-auto flex items-center gap-2">
                          <span className="text-sm font-semibold text-neutral-950">
                            {formatMoney(product.basePriceCents)}
                          </span>
                          {!product.isAvailable ? (
                            <span className="rounded-chip bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                              Esgotado
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>

      {itemCount > 0 ? (
        <Link
          href={`/m/${establishmentSlug}/t/${tableToken}/carrinho`}
          className="fixed inset-x-4 bottom-4 flex items-center justify-between rounded-control bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-lg"
        >
          <span>
            {itemCount} {itemCount === 1 ? "item" : "itens"} no carrinho
          </span>
          <span>{formatMoney(subtotalCents)}</span>
        </Link>
      ) : null}
    </div>
  );
}
