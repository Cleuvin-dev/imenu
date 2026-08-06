import type { Metadata } from "next";
import { getPlatformAdminContext } from "@/lib/auth/platform";
import { listAuditLogs } from "@/modules/audit/application/list-audit-logs";
import { auditActionLabel } from "@/modules/audit/domain/action-labels";
import { formatDateTimePtBr } from "@/lib/dates";

export const metadata: Metadata = {
  title: "Auditoria — Administração geral — iMenu",
};

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<{
    actorEmail?: string;
    action?: string;
    resourceType?: string;
    dateFrom?: string;
    dateTo?: string;
    establishmentId?: string;
  }>;
}) {
  const admin = await getPlatformAdminContext();
  if (!admin) {
    return null;
  }

  const filters = await searchParams;
  const logs = await listAuditLogs(filters);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold text-neutral-950">Auditoria</h1>
        <p className="text-sm text-neutral-600">
          Últimos 100 eventos. {admin.role === "platform_support" ? "Conteúdo antes/depois oculto para o seu papel." : ""}
        </p>
      </div>

      {filters.establishmentId ? (
        <p className="text-xs text-neutral-500">Filtrado por um estabelecimento específico.</p>
      ) : null}

      <form className="flex flex-wrap items-end gap-3 rounded-card border border-neutral-200 bg-white p-4">
        {filters.establishmentId ? <input type="hidden" name="establishmentId" value={filters.establishmentId} /> : null}
        <div className="flex flex-col gap-1">
          <label htmlFor="actorEmail" className="text-xs font-medium text-neutral-950">
            E-mail do ator
          </label>
          <input id="actorEmail" name="actorEmail" type="email" defaultValue={filters.actorEmail} className="rounded-control border border-neutral-200 px-2 py-1.5 text-sm" />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="action" className="text-xs font-medium text-neutral-950">
            Ação (contém)
          </label>
          <input id="action" name="action" type="text" defaultValue={filters.action} placeholder="payment.confirm" className="rounded-control border border-neutral-200 px-2 py-1.5 text-sm" />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="resourceType" className="text-xs font-medium text-neutral-950">
            Tipo de recurso
          </label>
          <input id="resourceType" name="resourceType" type="text" defaultValue={filters.resourceType} placeholder="invoice" className="rounded-control border border-neutral-200 px-2 py-1.5 text-sm" />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="dateFrom" className="text-xs font-medium text-neutral-950">
            De
          </label>
          <input id="dateFrom" name="dateFrom" type="date" defaultValue={filters.dateFrom} className="rounded-control border border-neutral-200 px-2 py-1.5 text-sm" />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="dateTo" className="text-xs font-medium text-neutral-950">
            Até
          </label>
          <input id="dateTo" name="dateTo" type="date" defaultValue={filters.dateTo} className="rounded-control border border-neutral-200 px-2 py-1.5 text-sm" />
        </div>
        <button type="submit" className="rounded-control border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:border-primary-600">
          Filtrar
        </button>
      </form>

      {logs.length === 0 ? (
        <p className="text-sm text-neutral-600">Nenhum evento encontrado com esses filtros.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {logs.map((log) => (
            <li key={log.id} className="rounded-card border border-neutral-200 bg-white">
              <details>
                <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-4 py-3">
                  <span className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-medium text-neutral-950">{auditActionLabel(log.action)}</span>
                    <span className="text-xs text-neutral-500">{log.resourceType}</span>
                    {log.establishmentTradeName ? (
                      <span className="rounded-chip bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                        {log.establishmentTradeName}
                      </span>
                    ) : null}
                  </span>
                  <span className="text-xs text-neutral-500">
                    {log.actorDisplayName ?? "Sistema"} · {formatDateTimePtBr(log.createdAt)}
                  </span>
                </summary>
                <div className="border-t border-neutral-200 px-4 py-3 text-xs text-neutral-700">
                  <p className="mb-2">
                    Ator: {log.actorEmail ?? "—"} ({log.actorScope})
                  </p>
                  {log.beforeData || log.afterData ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <p className="mb-1 font-medium text-neutral-950">Antes</p>
                        <pre className="overflow-x-auto rounded-control bg-neutral-50 p-2">
                          {JSON.stringify(log.beforeData, null, 2) ?? "—"}
                        </pre>
                      </div>
                      <div>
                        <p className="mb-1 font-medium text-neutral-950">Depois</p>
                        <pre className="overflow-x-auto rounded-control bg-neutral-50 p-2">
                          {JSON.stringify(log.afterData, null, 2) ?? "—"}
                        </pre>
                      </div>
                    </div>
                  ) : (
                    <p className="text-neutral-500">Sem detalhes adicionais.</p>
                  )}
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
