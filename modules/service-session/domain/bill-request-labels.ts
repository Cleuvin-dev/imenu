import type { BillRequestStatus } from "@/modules/service-session/schemas/bill-request.schema";

/** Rótulo operacional (caixa, docs/04 O-04). */
export const BILL_REQUEST_STATUS_LABELS: Record<BillRequestStatus, string> = {
  requested: "Solicitada",
  acknowledged: "Reconhecida",
  bill_delivered: "Conta entregue",
  closed: "Encerrada",
  canceled: "Cancelada",
};

/** Rótulo para o consumidor (docs/04 P-06: "recebido/visualizado/atendido"). */
export const PUBLIC_BILL_REQUEST_STATUS_LABELS: Record<BillRequestStatus, string> = {
  requested: "Recebida",
  acknowledged: "Visualizada",
  bill_delivered: "Atendida",
  closed: "Atendida",
  canceled: "Cancelada",
};

/** Verbo da ação do botão, não o nome do status de destino (lição de D-029). */
export const BILL_REQUEST_ACTION_LABELS: Partial<Record<BillRequestStatus, string>> = {
  acknowledged: "Reconhecer",
  bill_delivered: "Marcar conta entregue",
  canceled: "Cancelar solicitação",
};
