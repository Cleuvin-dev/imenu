import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { resolveActiveEstablishment } from "@/modules/tenancy/application/resolve-active-establishment";
import { listProducts } from "@/modules/catalog/application/products";
import { listCategories } from "@/modules/catalog/application/categories";
import { formatMoney } from "@/lib/money";
import { PRODUCT_STATUS_LABELS } from "@/modules/catalog/domain/labels";
import { createProductAction, archiveProductAction, setProductAvailabilityAction } from "./actions";
import { PublishButton } from "./publish-button";

export const metadata: Metadata = {
  title: "Produtos — iMenu",
};

export default async function ProdutosPage() {
  const resolution = await resolveActiveEstablishment();
  if (resolution.status !== "active") {
    redirect("/painel");
  }

  const establishmentId = resolution.establishment.establishmentId;
  const [products, categories] = await Promise.all([listProducts(establishmentId), listCategories(establishmentId)]);
  const activeCategories = categories.filter((category) => category.is_active);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold text-neutral-950">Produtos</h1>
        <p className="text-sm text-neutral-600">Crie, publique, esgote e arquive os itens do cardápio.</p>
      </div>

      {activeCategories.length === 0 ? (
        <p className="rounded-card border border-neutral-200 bg-white p-4 text-sm text-neutral-600">
          Crie uma categoria ativa antes de cadastrar produtos.{" "}
          <Link href="/painel/cardapio/categorias" className="font-medium text-primary-700 hover:underline">
            Ir para categorias
          </Link>
        </p>
      ) : (
        <form
          action={createProductAction}
          className="flex flex-col gap-3 rounded-card border border-neutral-200 bg-white p-4 sm:flex-row sm:items-end sm:flex-wrap"
        >
          <div className="flex flex-1 flex-col gap-1">
            <label htmlFor="name" className="text-xs font-medium text-neutral-950">
              Nome
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              maxLength={120}
              className="rounded-control border border-neutral-200 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="categoryId" className="text-xs font-medium text-neutral-950">
              Categoria
            </label>
            <select
              id="categoryId"
              name="categoryId"
              required
              className="rounded-control border border-neutral-200 px-3 py-2 text-sm"
            >
              {activeCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="basePriceCents" className="text-xs font-medium text-neutral-950">
              Preço (centavos)
            </label>
            <input
              id="basePriceCents"
              name="basePriceCents"
              type="number"
              min={0}
              required
              className="w-32 rounded-control border border-neutral-200 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <label htmlFor="shortDescription" className="text-xs font-medium text-neutral-950">
              Descrição curta
            </label>
            <input
              id="shortDescription"
              name="shortDescription"
              type="text"
              maxLength={240}
              className="rounded-control border border-neutral-200 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="rounded-control bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700"
          >
            Criar rascunho
          </button>
        </form>
      )}

      {products.length === 0 ? (
        <p className="text-sm text-neutral-600">Nenhum produto cadastrado ainda.</p>
      ) : (
        <div className="overflow-x-auto rounded-card border border-neutral-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-xs font-medium uppercase tracking-wide text-neutral-600">
              <tr>
                <th className="px-4 py-3">Produto</th>
                <th className="px-4 py-3">Categoria</th>
                <th className="px-4 py-3">Preço</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-b border-neutral-200 last:border-0 align-top">
                  <td className="px-4 py-3">
                    <Link
                      href={`/painel/cardapio/produtos/${product.id}`}
                      className="font-medium text-primary-700 hover:underline"
                    >
                      {product.name}
                    </Link>
                    {product.status === "published" && !product.is_available ? (
                      <span className="ml-2 rounded-chip bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                        Esgotado
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-neutral-700">{product.category?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-neutral-700">{formatMoney(product.base_price_cents)}</td>
                  <td className="px-4 py-3 text-neutral-700">{PRODUCT_STATUS_LABELS[product.status]}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col items-end gap-2">
                      {product.status === "draft" ? <PublishButton productId={product.id} /> : null}
                      {product.status === "published" ? (
                        <form action={setProductAvailabilityAction.bind(null, product.id, !product.is_available)}>
                          <button type="submit" className="text-xs font-medium text-primary-700 hover:underline">
                            {product.is_available ? "Marcar esgotado" : "Marcar disponível"}
                          </button>
                        </form>
                      ) : null}
                      {product.status !== "archived" ? (
                        <form action={archiveProductAction.bind(null, product.id)}>
                          <button type="submit" className="text-xs font-medium text-neutral-600 hover:underline">
                            Arquivar
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
