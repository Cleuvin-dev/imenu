/** Rótulos amigáveis para ações conhecidas de audit_logs; ações novas caem no fallback (o texto bruto). */
export const AUDIT_ACTION_LABELS: Record<string, string> = {
  "establishment.bootstrap": "Cadastro de estabelecimento",
  "establishment.manual_suspend": "Estabelecimento suspenso manualmente",
  "establishment.manual_reactivate": "Estabelecimento reativado manualmente",
  "platform_admin.grant_role": "Papel de administrador concedido",
  "platform_admin.reset_password": "Senha de administrador redefinida",
  "platform_admin.delete": "Administrador removido",
  "establishment_member.reset_password": "Senha de membro de equipe redefinida",
  "member.invite_accept": "Convite de equipe aceito",
  "payment.confirm": "Pagamento confirmado",
  "payment.reverse": "Pagamento estornado",
  "subscription.suspend": "Assinatura suspensa (automático)",
  "table_session.force_close_with_open_orders": "Sessão de mesa fechada à força",
};

export function auditActionLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? action;
}
