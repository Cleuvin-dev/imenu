import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { resolveActiveEstablishment } from "@/modules/tenancy/application/resolve-active-establishment";
import { listTables } from "@/modules/tables/application/tables";
import { createTableAction, updateTableAction, setTableActiveAction, regenerateTableTokenAction } from "./actions";
import { RegenerateTokenForm } from "./regenerate-token-form";

export const metadata: Metadata = {
  title: "Mesas e QR Codes — iMenu",
};

export default async function MesasPage() {
  const resolution = await resolveActiveEstablishment();
  if (resolution.status !== "active") {
    redirect("/painel");
  }

  const tables = await listTables(resolution.establishment.establishmentId);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold text-neutral-950">Mesas e QR Codes</h1>
        <p className="text-sm text-neutral-600">
          Cada mesa tem um QR exclusivo. Regenerar invalida imediatamente o código anterior.
        </p>
      </div>

      <form
        action={createTableAction}
        className="flex flex-col gap-3 rounded-card border border-neutral-200 bg-white p-4 sm:flex-row sm:items-end"
      >
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="name" className="text-xs font-medium text-neutral-950">
            Nome/número da mesa
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            maxLength={60}
            className="rounded-control border border-neutral-200 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          className="rounded-control bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700"
        >
          Criar mesa
        </button>
      </form>

      {tables.length === 0 ? (
        <p className="text-sm text-neutral-600">Nenhuma mesa cadastrada ainda.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {tables.map((table) => (
            <li key={table.id} className="rounded-card border border-neutral-200 bg-white">
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
                  <span className="flex items-center gap-2">
                    <span className="font-medium text-neutral-950">{table.name}</span>
                    {!table.is_active ? (
                      <span className="rounded-chip bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                        Desativada
                      </span>
                    ) : null}
                  </span>
                  <span className="text-xs font-medium text-primary-700 group-open:hidden">Gerenciar</span>
                  <span className="hidden text-xs font-medium text-primary-700 group-open:inline">Fechar</span>
                </summary>
                <div className="flex flex-col gap-4 border-t border-neutral-200 p-4">
                  <form action={updateTableAction.bind(null, table.id)} className="flex flex-wrap items-end gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-neutral-950">Nome</label>
                      <input
                        name="name"
                        type="text"
                        required
                        maxLength={60}
                        defaultValue={table.name}
                        className="rounded-control border border-neutral-200 px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-neutral-950">Ordem</label>
                      <input
                        name="sortOrder"
                        type="number"
                        min={0}
                        defaultValue={table.sort_order}
                        className="w-24 rounded-control border border-neutral-200 px-3 py-2 text-sm"
                      />
                    </div>
                    <button
                      type="submit"
                      className="rounded-control bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700"
                    >
                      Salvar
                    </button>
                  </form>

                  <div className="flex flex-wrap items-center gap-4">
                    <a
                      href={`/api/establishments/mesas/${table.id}/qr`}
                      className="text-xs font-medium text-primary-700 hover:underline"
                    >
                      Baixar QR (PNG)
                    </a>
                    <a
                      href={`/api/establishments/mesas/${table.id}/qr?format=svg`}
                      className="text-xs font-medium text-primary-700 hover:underline"
                    >
                      Baixar QR (SVG)
                    </a>
                    <RegenerateTokenForm action={regenerateTableTokenAction.bind(null, table.id)} />
                    <form action={setTableActiveAction.bind(null, table.id, !table.is_active)}>
                      <button type="submit" className="text-xs font-medium text-neutral-600 hover:underline">
                        {table.is_active ? "Desativar mesa" : "Reativar mesa"}
                      </button>
                    </form>
                  </div>
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
