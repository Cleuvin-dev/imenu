import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { resolveActiveEstablishment } from "@/modules/tenancy/application/resolve-active-establishment";
import { listCategories } from "@/modules/catalog/application/categories";
import { createCategoryAction, updateCategoryAction, setCategoryActiveAction } from "./actions";

export const metadata: Metadata = {
  title: "Categorias — iMenu",
};

export default async function CategoriasPage() {
  const resolution = await resolveActiveEstablishment();
  if (resolution.status !== "active") {
    redirect("/painel");
  }

  const categories = await listCategories(resolution.establishment.establishmentId);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold text-neutral-950">Categorias</h1>
        <p className="text-sm text-neutral-600">Organize o cardápio em categorias. Categorias arquivadas somem do menu.</p>
      </div>

      <form action={createCategoryAction} className="flex flex-col gap-3 rounded-card border border-neutral-200 bg-white p-4 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="name" className="text-xs font-medium text-neutral-950">
            Nome
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            maxLength={80}
            className="rounded-control border border-neutral-200 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="description" className="text-xs font-medium text-neutral-950">
            Descrição (opcional)
          </label>
          <input
            id="description"
            name="description"
            type="text"
            maxLength={2000}
            className="rounded-control border border-neutral-200 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          className="rounded-control bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700"
        >
          Criar categoria
        </button>
      </form>

      {categories.length === 0 ? (
        <p className="text-sm text-neutral-600">Nenhuma categoria cadastrada ainda.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {categories.map((category) => (
            <li key={category.id} className="rounded-card border border-neutral-200 bg-white">
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
                  <span className="flex items-center gap-2">
                    <span className="font-medium text-neutral-950">{category.name}</span>
                    {!category.is_active ? (
                      <span className="rounded-chip bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">Arquivada</span>
                    ) : null}
                  </span>
                  <span className="text-xs font-medium text-primary-700 group-open:hidden">Editar</span>
                  <span className="hidden text-xs font-medium text-primary-700 group-open:inline">Fechar</span>
                </summary>
                <div className="border-t border-neutral-200 p-4">
                  <form action={updateCategoryAction.bind(null, category.id)} className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-neutral-950">Nome</label>
                      <input
                        name="name"
                        type="text"
                        required
                        maxLength={80}
                        defaultValue={category.name}
                        className="rounded-control border border-neutral-200 px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-neutral-950">Descrição</label>
                      <input
                        name="description"
                        type="text"
                        maxLength={2000}
                        defaultValue={category.description ?? ""}
                        className="rounded-control border border-neutral-200 px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-neutral-950">Ordem</label>
                      <input
                        name="sortOrder"
                        type="number"
                        min={0}
                        defaultValue={category.sort_order}
                        className="w-24 rounded-control border border-neutral-200 px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="submit"
                        className="rounded-control bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700"
                      >
                        Salvar
                      </button>
                    </div>
                  </form>
                  <form action={setCategoryActiveAction.bind(null, category.id, !category.is_active)} className="mt-3">
                    <button type="submit" className="text-sm font-medium text-neutral-600 hover:underline">
                      {category.is_active ? "Arquivar categoria" : "Reativar categoria"}
                    </button>
                  </form>
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
