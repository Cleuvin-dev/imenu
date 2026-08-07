"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  suspendEstablishmentAction,
  reactivateEstablishmentAction,
  type SuspendEstablishmentActionState,
  type ReactivateEstablishmentActionState,
} from "@/app/(platform)/admin-geral/estabelecimentos/[id]/actions";
import { ACCESS_BLOCK_REASON_LABELS } from "@/modules/billing/domain/labels";
import { formatDateTimePtBr } from "@/lib/dates";

const SUSPENSION_REASONS = ["manual", "fraud", "contract_end", "other"] as const;

const suspendInitialState: SuspendEstablishmentActionState = {};
const reactivateInitialState: ReactivateEstablishmentActionState = {};

function SuspendButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-control bg-danger px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Suspendendo…" : "Suspender estabelecimento"}
    </button>
  );
}

function ReactivateButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-control bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Reativando…" : "Reativar estabelecimento"}
    </button>
  );
}

export function SuspensionControl({
  establishmentId,
  manualSuspendedAt,
  manualSuspensionReason,
}: {
  establishmentId: string;
  manualSuspendedAt: string | null;
  manualSuspensionReason: string | null;
}) {
  const suspendAction = suspendEstablishmentAction.bind(null, establishmentId);
  const reactivateAction = reactivateEstablishmentAction.bind(null, establishmentId);
  const [suspendState, suspendFormAction] = useActionState(suspendAction, suspendInitialState);
  const [reactivateState, reactivateFormAction] = useActionState(reactivateAction, reactivateInitialState);

  if (manualSuspendedAt) {
    return (
      <div className="flex flex-col gap-2 rounded-control border border-danger/30 bg-danger/10 p-3 text-sm">
        <p className="font-medium text-danger">
          Suspenso manualmente desde {formatDateTimePtBr(manualSuspendedAt)}
          {manualSuspensionReason ? ` — ${ACCESS_BLOCK_REASON_LABELS[manualSuspensionReason] ?? manualSuspensionReason}` : ""}
        </p>
        <p className="text-xs text-neutral-600">
          Painel e cardápio público bloqueados; todos os dados foram preservados.
        </p>
        <form
          action={reactivateFormAction}
          onSubmit={(event) => {
            if (!window.confirm("Reativar este estabelecimento? O painel e o cardápio público voltam a funcionar imediatamente.")) {
              event.preventDefault();
            }
          }}
        >
          <ReactivateButton />
          {reactivateState.error ? <p className="mt-1 text-xs text-danger">{reactivateState.error}</p> : null}
        </form>
      </div>
    );
  }

  return (
    <form
      action={suspendFormAction}
      className="flex flex-wrap items-end gap-2"
      onSubmit={(event) => {
        const form = event.currentTarget;
        const reasonValue = (new FormData(form).get("reason") as string) || "";
        if (!window.confirm(`Suspender este estabelecimento (motivo: ${ACCESS_BLOCK_REASON_LABELS[reasonValue] ?? reasonValue})? Painel e cardápio público ficam bloqueados até você reativar. Nenhum dado é apagado.`)) {
          event.preventDefault();
        }
      }}
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="reason" className="text-xs font-medium text-neutral-950">
          Motivo da suspensão manual
        </label>
        <select id="reason" name="reason" required defaultValue="manual" className="rounded-control border border-neutral-200 px-2 py-1.5 text-xs">
          {SUSPENSION_REASONS.map((reason) => (
            <option key={reason} value={reason}>
              {ACCESS_BLOCK_REASON_LABELS[reason] ?? reason}
            </option>
          ))}
        </select>
      </div>
      <SuspendButton />
      {suspendState.error ? <p className="text-xs text-danger">{suspendState.error}</p> : null}
    </form>
  );
}
