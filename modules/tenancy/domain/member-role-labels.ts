import type { MemberRole } from "@/lib/auth/tenant";

export const MEMBER_ROLE_LABELS: Record<MemberRole, string> = {
  owner: "Proprietário",
  manager: "Gerente",
  menu_editor: "Editor de cardápio",
  kitchen: "Cozinha",
  cashier: "Caixa",
  viewer: "Visualizador",
};
