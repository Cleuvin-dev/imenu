import type { Metadata } from "next";
import { getPlatformAdminContext } from "@/lib/auth/platform";
import { listPlatformAdmins } from "@/modules/platform-admin/application/list-admins";
import { PLATFORM_ROLE_LABELS } from "@/modules/platform-admin/domain/platform-role-labels";
import { formatDateTimePtBr } from "@/lib/dates";
import { AddAdminForm } from "@/app/(platform)/admin-geral/administradores/add-admin-form";
import { updateAdminRoleAction, setAdminActiveAction } from "@/app/(platform)/admin-geral/administradores/actions";
import { ResetPasswordButton } from "@/app/(platform)/admin-geral/administradores/reset-password-button";
import { DeleteAdminButton } from "@/app/(platform)/admin-geral/administradores/delete-admin-button";

export const metadata: Metadata = {
  title: "Administradores — Administração geral — iMenu",
};

export default async function AdministradoresPage() {
  const admin = await getPlatformAdminContext();
  if (!admin) {
    return null;
  }

  if (admin.role !== "super_admin") {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center">
        <h1 className="text-lg font-semibold text-neutral-950">Acesso restrito</h1>
        <p className="max-w-sm text-sm text-neutral-600">
          Somente super administradores gerenciam outros administradores da plataforma.
        </p>
      </div>
    );
  }

  const admins = await listPlatformAdmins();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold text-neutral-950">Administradores da plataforma</h1>
        <p className="text-sm text-neutral-600">O último super administrador ativo não pode ser removido nem rebaixado.</p>
      </div>

      <AddAdminForm />

      <ul className="flex flex-col gap-2">
        {admins.map((item) => (
          <li
            key={item.userId}
            className="flex flex-col gap-3 rounded-card border border-neutral-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="text-sm font-medium text-neutral-950">
                {item.displayName}
                {!item.isActive ? (
                  <span className="ml-2 rounded-chip bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">Desativado</span>
                ) : null}
              </p>
              <p className="text-xs text-neutral-600">
                {item.email} · desde {formatDateTimePtBr(item.createdAt)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <form action={updateAdminRoleAction.bind(null, item.userId)} className="flex items-center gap-2">
                <select name="role" defaultValue={item.role} className="rounded-control border border-neutral-200 px-2 py-1.5 text-xs">
                  {Object.entries(PLATFORM_ROLE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <button type="submit" className="text-xs font-medium text-primary-700 hover:underline">
                  Salvar
                </button>
              </form>
              <form action={setAdminActiveAction.bind(null, item.userId, !item.isActive)}>
                <button type="submit" className="text-xs font-medium text-neutral-600 hover:underline">
                  {item.isActive ? "Desativar" : "Reativar"}
                </button>
              </form>
              <ResetPasswordButton userId={item.userId} />
              <DeleteAdminButton userId={item.userId} displayName={item.displayName} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
