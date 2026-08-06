import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { resolveActiveEstablishment } from "@/modules/tenancy/application/resolve-active-establishment";
import { listBusinessHours } from "@/modules/catalog/application/business-hours";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { WEEKDAY_LABELS, WEEKDAYS_ORDER } from "@/modules/catalog/domain/business-hours-labels";
import { formatDateTimePtBr } from "@/lib/dates";
import {
  upsertBusinessHourAction,
  upsertBusinessHourExceptionAction,
  deleteBusinessHourExceptionAction,
  setAcceptingOrdersAction,
} from "@/app/(establishment)/painel/horarios/actions";

export const metadata: Metadata = {
  title: "Horários e operação — iMenu",
};

function toTimeInputValue(value: string | null): string {
  return value ? value.slice(0, 5) : "";
}

export default async function HorariosPage() {
  const resolution = await resolveActiveEstablishment();
  if (resolution.status !== "active") {
    redirect("/painel");
  }

  const { establishmentId, role } = resolution.establishment;

  if (role !== "owner" && role !== "manager") {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center">
        <h1 className="text-lg font-semibold text-neutral-950">Acesso restrito</h1>
        <p className="max-w-sm text-sm text-neutral-600">
          Seu papel não tem acesso a horários e operação. Fale com o proprietário ou gerente.
        </p>
      </div>
    );
  }

  const [{ hours, exceptions }, establishmentResult] = await Promise.all([
    listBusinessHours(establishmentId),
    (await createSupabaseServerClient())
      .from("establishments")
      .select("accepting_orders")
      .eq("id", establishmentId)
      .single(),
  ]);

  const acceptingOrders = establishmentResult.data?.accepting_orders ?? true;
  const hoursByWeekday = new Map(hours.map((row) => [row.weekday, row]));
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold text-neutral-950">Horários e operação</h1>
        <p className="text-sm text-neutral-600">Grade semanal, exceções por data e controle manual de pedidos.</p>
      </div>

      <div className="flex items-center justify-between rounded-card border border-neutral-200 bg-white p-4">
        <div>
          <p className="text-sm font-semibold text-neutral-950">Aceitar novos pedidos</p>
          <p className="text-xs text-neutral-600">
            {acceptingOrders ? "O cardápio público está aceitando pedidos." : "Pedidos pausados manualmente agora."}
          </p>
        </div>
        <form action={setAcceptingOrdersAction.bind(null, !acceptingOrders)}>
          <button
            type="submit"
            className={
              acceptingOrders
                ? "rounded-control border border-danger px-4 py-2 text-sm font-medium text-danger transition hover:bg-danger/10"
                : "rounded-control bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700"
            }
          >
            {acceptingOrders ? "Pausar pedidos" : "Retomar pedidos"}
          </button>
        </form>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-neutral-950">Grade semanal</h2>
        <div className="flex flex-col gap-2">
          {WEEKDAYS_ORDER.map((weekday) => {
            const row = hoursByWeekday.get(weekday);
            const isClosed = row?.isClosed ?? true;
            return (
              <form
                key={weekday}
                action={upsertBusinessHourAction.bind(null, weekday)}
                className="flex flex-wrap items-center gap-3 rounded-card border border-neutral-200 bg-white p-3"
              >
                <span className="w-32 text-sm font-medium text-neutral-950">{WEEKDAY_LABELS[weekday]}</span>
                <label className="flex items-center gap-1.5 text-xs text-neutral-700">
                  <input type="checkbox" name="isClosed" defaultChecked={isClosed} />
                  Fechado
                </label>
                <label className="flex items-center gap-1.5 text-xs text-neutral-700">
                  Abre
                  <input
                    type="time"
                    name="opensAt"
                    defaultValue={toTimeInputValue(row?.opensAt ?? null)}
                    className="rounded-control border border-neutral-200 px-2 py-1 text-sm"
                  />
                </label>
                <label className="flex items-center gap-1.5 text-xs text-neutral-700">
                  Fecha
                  <input
                    type="time"
                    name="closesAt"
                    defaultValue={toTimeInputValue(row?.closesAt ?? null)}
                    className="rounded-control border border-neutral-200 px-2 py-1 text-sm"
                  />
                </label>
                <button
                  type="submit"
                  className="ml-auto rounded-control bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-primary-700"
                >
                  Salvar
                </button>
              </form>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-neutral-950">Exceções por data</h2>
        <p className="text-xs text-neutral-600">Ex.: feriado, evento especial ou fechamento pontual.</p>

        <form
          action={upsertBusinessHourExceptionAction}
          className="flex flex-wrap items-end gap-3 rounded-card border border-neutral-200 bg-white p-4"
        >
          <div className="flex flex-col gap-1">
            <label htmlFor="exception-date" className="text-xs font-medium text-neutral-950">
              Data
            </label>
            <input
              id="exception-date"
              name="date"
              type="date"
              required
              min={today}
              className="rounded-control border border-neutral-200 px-2 py-1.5 text-sm"
            />
          </div>
          <label className="flex items-center gap-1.5 text-xs text-neutral-700">
            <input type="checkbox" name="isClosed" />
            Fechado o dia todo
          </label>
          <label className="flex items-center gap-1.5 text-xs text-neutral-700">
            Abre
            <input type="time" name="opensAt" className="rounded-control border border-neutral-200 px-2 py-1 text-sm" />
          </label>
          <label className="flex items-center gap-1.5 text-xs text-neutral-700">
            Fecha
            <input
              type="time"
              name="closesAt"
              className="rounded-control border border-neutral-200 px-2 py-1 text-sm"
            />
          </label>
          <div className="flex flex-1 flex-col gap-1">
            <label htmlFor="exception-note" className="text-xs font-medium text-neutral-950">
              Nota (opcional)
            </label>
            <input
              id="exception-note"
              name="note"
              type="text"
              maxLength={200}
              className="w-full rounded-control border border-neutral-200 px-2 py-1.5 text-sm"
            />
          </div>
          <button
            type="submit"
            className="rounded-control bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700"
          >
            Salvar exceção
          </button>
        </form>

        {exceptions.length === 0 ? (
          <p className="text-sm text-neutral-600">Nenhuma exceção futura cadastrada.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {exceptions.map((exception) => (
              <li
                key={exception.id}
                className="flex items-center justify-between rounded-card border border-neutral-200 bg-white px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium text-neutral-950">{formatDateTimePtBr(`${exception.date}T12:00:00Z`)}</p>
                  <p className="text-xs text-neutral-600">
                    {exception.isClosed
                      ? "Fechado o dia todo"
                      : `${toTimeInputValue(exception.opensAt)} – ${toTimeInputValue(exception.closesAt)}`}
                    {exception.note ? ` · ${exception.note}` : ""}
                  </p>
                </div>
                <form action={deleteBusinessHourExceptionAction.bind(null, exception.id)}>
                  <button type="submit" className="text-xs font-medium text-danger hover:underline">
                    Remover
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
