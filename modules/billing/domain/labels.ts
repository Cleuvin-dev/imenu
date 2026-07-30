import type { Database } from "@/lib/supabase/database-types";

export const SUBSCRIPTION_STATUS_LABELS: Record<Database["public"]["Enums"]["subscription_status"], string> = {
  trialing: "Em teste",
  active: "Ativa",
  past_due: "Em atraso",
  suspended: "Suspensa",
  canceled: "Cancelada",
};

export const INVOICE_STATUS_LABELS: Record<Database["public"]["Enums"]["invoice_status"], string> = {
  draft: "Rascunho",
  open: "Aberta",
  paid: "Paga",
  overdue: "Vencida",
  void: "Anulada",
};

export const PAYMENT_METHOD_LABELS: Record<Database["public"]["Enums"]["payment_method"], string> = {
  pix: "Pix",
  boleto: "Boleto",
  transfer: "Transferência",
  cash: "Dinheiro",
  card: "Cartão",
  other: "Outro",
};

export const ACCESS_BLOCK_REASON_LABELS: Record<string, string> = {
  not_found: "Estabelecimento não encontrado.",
  inactive: "Estabelecimento inativo.",
  no_subscription: "Nenhuma assinatura cadastrada.",
  overdue: "Assinatura suspensa por atraso no pagamento.",
  canceled: "Assinatura cancelada.",
  manual: "Serviço bloqueado manualmente pela administração do iMenu.",
  fraud: "Serviço bloqueado pela administração do iMenu.",
  contract_end: "Contrato encerrado.",
  other: "Serviço temporariamente indisponível.",
  evaluation_error: "Não foi possível confirmar a situação da assinatura.",
};
