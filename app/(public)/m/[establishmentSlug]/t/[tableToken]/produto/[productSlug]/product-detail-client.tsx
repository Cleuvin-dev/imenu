"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/money";
import { buildPublicMediaUrl } from "@/modules/media/domain/public-url";
import { readCart, writeCart } from "@/modules/service-session/domain/cart";
import type { PublicMenuProduct } from "@/modules/service-session/schemas/public-menu.schema";

export function ProductDetailClient({
  product,
  establishmentSlug,
  tableToken,
  supabaseUrl,
  canOrder,
  blockedReason,
}: {
  product: PublicMenuProduct;
  establishmentSlug: string;
  tableToken: string;
  supabaseUrl: string;
  canOrder: boolean;
  blockedReason: string | null;
}) {
  const router = useRouter();
  const [selections, setSelections] = useState<Record<string, Set<string>>>({});
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);

  const primaryMedia = product.media.find((m) => m.isPrimary) ?? product.media[0];

  function toggleOption(groupId: string, optionId: string, maxSelect: number) {
    setSelections((prev) => {
      const current = new Set(prev[groupId] ?? []);
      if (current.has(optionId)) {
        current.delete(optionId);
      } else {
        if (maxSelect === 1) {
          current.clear();
        } else if (current.size >= maxSelect) {
          return prev;
        }
        current.add(optionId);
      }
      return { ...prev, [groupId]: current };
    });
  }

  function validate(): string | null {
    for (const group of product.optionGroups) {
      const count = selections[group.id]?.size ?? 0;
      if (count < group.minSelect) {
        return `Selecione ao menos ${group.minSelect} opção(ões) em "${group.name}".`;
      }
      if (count > group.maxSelect) {
        return `Selecione no máximo ${group.maxSelect} opção(ões) em "${group.name}".`;
      }
    }
    return null;
  }

  function handleAddToCart() {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      requestAnimationFrame(() => errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
      return;
    }

    const selectedOptionNames: string[] = [];
    let optionsTotalCents = 0;
    for (const group of product.optionGroups) {
      const selectedIds = selections[group.id] ?? new Set<string>();
      for (const option of group.options) {
        if (selectedIds.has(option.id)) {
          selectedOptionNames.push(option.name);
          optionsTotalCents += option.priceDeltaCents;
        }
      }
    }

    const cart = readCart(establishmentSlug, tableToken);
    cart.items.push({
      id: crypto.randomUUID(),
      productId: product.id,
      productSlug: product.slug,
      name: product.name,
      unitPriceCents: product.basePriceCents + optionsTotalCents,
      quantity,
      optionNames: selectedOptionNames,
      notes: notes.trim() || undefined,
    });
    writeCart(establishmentSlug, tableToken, cart);
    router.push(`/m/${establishmentSlug}/t/${tableToken}`);
  }

  const canAdd = canOrder && product.isAvailable;

  return (
    <div className="flex flex-col gap-4 pb-28">
      <div className="aspect-video w-full bg-neutral-100">
        {primaryMedia ? (
          primaryMedia.kind === "video" ? (
            <video
              src={buildPublicMediaUrl(supabaseUrl, "menu-media", primaryMedia.storagePath)}
              poster={
                primaryMedia.posterPath
                  ? buildPublicMediaUrl(supabaseUrl, "menu-media", primaryMedia.posterPath)
                  : undefined
              }
              controls
              preload="metadata"
              className="h-full w-full object-cover"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={buildPublicMediaUrl(supabaseUrl, "menu-media", primaryMedia.storagePath)}
              alt={primaryMedia.altText ?? product.name}
              className="h-full w-full object-cover"
            />
          )
        ) : null}
      </div>

      <div className="flex flex-col gap-3 px-4">
        <div>
          <h1 className="text-lg font-semibold text-neutral-950">{product.name}</h1>
          <p className="mt-1 text-base font-semibold text-primary-700">{formatMoney(product.basePriceCents)}</p>
        </div>

        {product.description ? <p className="text-sm text-neutral-700">{product.description}</p> : null}

        {product.ingredients.length > 0 ? (
          <div>
            <h2 className="text-xs font-semibold uppercase text-neutral-500">Ingredientes</h2>
            <p className="text-sm text-neutral-700">{product.ingredients.join(", ")}</p>
          </div>
        ) : null}

        {product.allergens.length > 0 ? (
          <div>
            <h2 className="text-xs font-semibold uppercase text-neutral-500">Alergênicos</h2>
            <p className="text-sm text-neutral-700">{product.allergens.join(", ")}</p>
          </div>
        ) : null}

        {!product.isAvailable ? (
          <p className="rounded-control bg-neutral-100 px-3 py-2 text-sm text-neutral-700">
            Este item está esgotado no momento.
          </p>
        ) : !canOrder ? (
          <p className="rounded-control bg-warning/10 px-3 py-2 text-sm text-warning">
            {blockedReason === "closed"
              ? "Fora do horário de funcionamento — pedidos indisponíveis agora."
              : "Pedidos pausados temporariamente pela equipe do local."}
          </p>
        ) : null}

        {product.optionGroups.map((group) => (
          <fieldset key={group.id} className="flex flex-col gap-2 rounded-card border border-neutral-200 p-3">
            <legend className="px-1 text-sm font-medium text-neutral-950">
              {group.name}{" "}
              <span className="text-xs font-normal text-neutral-500">
                ({group.minSelect > 0 ? `mín. ${group.minSelect}, ` : ""}máx. {group.maxSelect})
              </span>
            </legend>
            {group.options.map((option) => {
              const isChecked = selections[group.id]?.has(option.id) ?? false;
              return (
                <label key={option.id} className="flex items-center justify-between gap-2 text-sm text-neutral-700">
                  <span className="flex items-center gap-2">
                    <input
                      type={group.maxSelect === 1 ? "radio" : "checkbox"}
                      name={`group-${group.id}`}
                      checked={isChecked}
                      onChange={() => toggleOption(group.id, option.id, group.maxSelect)}
                      className="h-4 w-4"
                    />
                    {option.name}
                  </span>
                  {option.priceDeltaCents > 0 ? <span>+{formatMoney(option.priceDeltaCents)}</span> : null}
                </label>
              );
            })}
          </fieldset>
        ))}

        <div className="flex flex-col gap-1">
          <label htmlFor="notes" className="text-xs font-medium text-neutral-950">
            Observação (opcional)
          </label>
          <textarea
            id="notes"
            maxLength={300}
            rows={2}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="rounded-control border border-neutral-200 px-3 py-2 text-sm"
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-neutral-950">Quantidade</span>
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="h-8 w-8 rounded-control border border-neutral-200 text-neutral-700"
            aria-label="Diminuir quantidade"
          >
            −
          </button>
          <span className="w-6 text-center text-sm">{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.min(20, q + 1))}
            className="h-8 w-8 rounded-control border border-neutral-200 text-neutral-700"
            aria-label="Aumentar quantidade"
          >
            +
          </button>
        </div>

        {error ? (
          <p ref={errorRef} role="alert" className="rounded-control bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        ) : null}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-neutral-200 bg-white p-4">
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={!canAdd}
          className="w-full rounded-control bg-primary-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Adicionar — {formatMoney(product.basePriceCents * quantity)}
        </button>
      </div>
    </div>
  );
}
