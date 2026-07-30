import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { resolveActiveEstablishment } from "@/modules/tenancy/application/resolve-active-establishment";
import { getProduct } from "@/modules/catalog/application/products";
import { listCategories } from "@/modules/catalog/application/categories";
import { listOptionGroups, listProductOptionGroups } from "@/modules/catalog/application/options";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/money";
import { PRODUCT_STATUS_LABELS } from "@/modules/catalog/domain/labels";
import {
  updateProductAction,
  archiveProductDetailAction,
  setProductAvailabilityDetailAction,
  deleteProductMediaAction,
  createOptionGroupAction,
  createOptionAction,
  attachOptionGroupAction,
  detachOptionGroupAction,
} from "./actions";
import { MediaUploadForm } from "./media-upload-form";
import { PublishButton } from "./publish-button";

export const metadata: Metadata = {
  title: "Editar produto — iMenu",
};

export default async function ProdutoEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const resolution = await resolveActiveEstablishment();
  if (resolution.status !== "active") {
    redirect("/painel");
  }

  const { id } = await params;
  const establishmentId = resolution.establishment.establishmentId;

  const product = await getProduct(id);
  if (!product || product.establishment_id !== establishmentId) {
    notFound();
  }

  const [categories, optionGroups, attachedGroups] = await Promise.all([
    listCategories(establishmentId),
    listOptionGroups(establishmentId),
    listProductOptionGroups(id),
  ]);

  const supabase = await createSupabaseServerClient();
  const { data: media } = await supabase
    .from("product_media")
    .select("*")
    .eq("product_id", id)
    .order("sort_order");

  const attachedGroupIds = new Set(attachedGroups.map((row) => row.option_group_id));

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-neutral-950">{product.name}</h1>
          <p className="text-sm text-neutral-600">
            {PRODUCT_STATUS_LABELS[product.status]}
            {product.status === "published" && !product.is_available ? " · Esgotado" : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {product.status === "draft" ? <PublishButton productId={product.id} /> : null}
          {product.status === "published" ? (
            <form action={setProductAvailabilityDetailAction.bind(null, product.id, !product.is_available)}>
              <button type="submit" className="rounded-control border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:border-primary-600">
                {product.is_available ? "Marcar esgotado" : "Marcar disponível"}
              </button>
            </form>
          ) : null}
          {product.status !== "archived" ? (
            <form action={archiveProductDetailAction.bind(null, product.id)}>
              <button type="submit" className="rounded-control border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:border-danger">
                Arquivar
              </button>
            </form>
          ) : null}
        </div>
      </div>

      <section className="rounded-card border border-neutral-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-neutral-950">Informações e preço</h2>
        <form action={updateProductAction.bind(null, product.id)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-950">Nome</label>
            <input
              name="name"
              type="text"
              required
              maxLength={120}
              defaultValue={product.name}
              className="rounded-control border border-neutral-200 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-950">Categoria</label>
            <select
              name="categoryId"
              required
              defaultValue={product.category_id}
              className="rounded-control border border-neutral-200 px-3 py-2 text-sm"
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-950">Preço (centavos)</label>
            <input
              name="basePriceCents"
              type="number"
              min={0}
              required
              defaultValue={product.base_price_cents}
              className="rounded-control border border-neutral-200 px-3 py-2 text-sm"
            />
            <span className="text-xs text-neutral-500">{formatMoney(product.base_price_cents)}</span>
          </div>
          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className="text-xs font-medium text-neutral-950">Descrição curta</label>
            <input
              name="shortDescription"
              type="text"
              maxLength={240}
              defaultValue={product.short_description ?? ""}
              className="rounded-control border border-neutral-200 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className="text-xs font-medium text-neutral-950">Descrição completa</label>
            <textarea
              name="description"
              maxLength={2000}
              rows={4}
              defaultValue={product.description ?? ""}
              className="rounded-control border border-neutral-200 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-950">Ingredientes (separados por vírgula)</label>
            <input
              name="ingredients"
              type="text"
              defaultValue={product.ingredients.join(", ")}
              className="rounded-control border border-neutral-200 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-950">Alergênicos (separados por vírgula)</label>
            <input
              name="allergens"
              type="text"
              defaultValue={product.allergens.join(", ")}
              className="rounded-control border border-neutral-200 px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded-control bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700"
            >
              Salvar alterações
            </button>
          </div>
        </form>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-neutral-950">Mídia</h2>
        {media && media.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {media.map((item) => {
              const publicUrl = supabase.storage.from("menu-media").getPublicUrl(item.storage_path).data.publicUrl;
              return (
                <div key={item.id} className="flex flex-col gap-2 rounded-card border border-neutral-200 bg-white p-2">
                  {item.kind === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={publicUrl} alt={item.alt_text ?? ""} className="aspect-square w-full rounded-control object-cover" />
                  ) : (
                    <video src={publicUrl} className="aspect-square w-full rounded-control object-cover" controls />
                  )}
                  {item.is_primary ? (
                    <span className="rounded-chip bg-primary-50 px-2 py-0.5 text-center text-xs text-primary-700">Principal</span>
                  ) : null}
                  <form action={deleteProductMediaAction.bind(null, product.id, item.id)}>
                    <button type="submit" className="w-full text-xs font-medium text-danger hover:underline">
                      Remover
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-neutral-600">Nenhuma mídia enviada ainda.</p>
        )}
        <MediaUploadForm productId={product.id} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-neutral-950">Grupos de opções</h2>
        <p className="text-sm text-neutral-600">
          Associe grupos de opções já existentes a este produto, ou crie um novo grupo abaixo.
        </p>
        <div className="flex flex-col gap-3">
          {optionGroups.map((group) => {
            const isAttached = attachedGroupIds.has(group.id);
            return (
              <div key={group.id} className="rounded-card border border-neutral-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-neutral-950">{group.name}</p>
                    <p className="text-xs text-neutral-600">
                      Seleção mínima {group.min_select} · máxima {group.max_select}
                    </p>
                  </div>
                  <form
                    action={
                      isAttached
                        ? detachOptionGroupAction.bind(null, product.id, group.id)
                        : attachOptionGroupAction.bind(null, product.id, group.id)
                    }
                  >
                    <button
                      type="submit"
                      className={
                        isAttached
                          ? "rounded-control border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:border-danger"
                          : "rounded-control bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-700"
                      }
                    >
                      {isAttached ? "Remover deste produto" : "Adicionar a este produto"}
                    </button>
                  </form>
                </div>
                {group.options.length > 0 ? (
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {group.options.map((option) => (
                      <li key={option.id} className="rounded-chip bg-neutral-100 px-2 py-1 text-xs text-neutral-700">
                        {option.name} {option.price_delta_cents > 0 ? `(+${formatMoney(option.price_delta_cents)})` : ""}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <form action={createOptionAction.bind(null, group.id)} className="mt-3 flex flex-wrap items-end gap-2">
                  <input
                    name="name"
                    type="text"
                    placeholder="Nome do adicional"
                    required
                    maxLength={120}
                    className="rounded-control border border-neutral-200 px-3 py-1.5 text-sm"
                  />
                  <input
                    name="priceDeltaCents"
                    type="number"
                    min={0}
                    placeholder="Preço (centavos)"
                    className="w-40 rounded-control border border-neutral-200 px-3 py-1.5 text-sm"
                  />
                  <button type="submit" className="text-xs font-medium text-primary-700 hover:underline">
                    Adicionar opção
                  </button>
                </form>
              </div>
            );
          })}
        </div>

        <form action={createOptionGroupAction} className="flex flex-wrap items-end gap-3 rounded-card border border-neutral-200 bg-white p-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-950">Novo grupo</label>
            <input name="name" type="text" required maxLength={80} className="rounded-control border border-neutral-200 px-3 py-2 text-sm" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-950">Mínimo</label>
            <input name="minSelect" type="number" min={0} defaultValue={0} className="w-20 rounded-control border border-neutral-200 px-3 py-2 text-sm" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-950">Máximo</label>
            <input name="maxSelect" type="number" min={1} defaultValue={1} required className="w-20 rounded-control border border-neutral-200 px-3 py-2 text-sm" />
          </div>
          <button type="submit" className="rounded-control bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">
            Criar grupo
          </button>
        </form>
      </section>
    </div>
  );
}
