import type { PlatformRole } from "@/lib/auth/platform";

export const PLATFORM_ROLE_LABELS: Record<PlatformRole, string> = {
  super_admin: "Superadministrador",
  platform_admin: "Administrador da plataforma",
  platform_support: "Suporte",
};
