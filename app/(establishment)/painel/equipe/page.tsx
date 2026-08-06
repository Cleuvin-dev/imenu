import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { resolveActiveEstablishment } from "@/modules/tenancy/application/resolve-active-establishment";
import { listTeam } from "@/modules/tenancy/application/list-team";
import { MEMBER_ROLE_LABELS } from "@/modules/tenancy/domain/member-role-labels";
import { formatDateTimePtBr } from "@/lib/dates";
import { InviteForm } from "@/app/(establishment)/painel/equipe/invite-form";
import { revokeInviteAction, updateMemberRoleAction, setMemberActiveAction } from "@/app/(establishment)/painel/equipe/actions";
import type { Database } from "@/lib/supabase/database-types";

type MemberRole = Database["public"]["Enums"]["member_role"];

// docs/02 §3: "Equipe e permissões" só tem acesso G/G* para owner/manager.
const TEAM_ROLES = Object.keys(MEMBER_ROLE_LABELS) as MemberRole[];

export const metadata: Metadata = {
  title: "Equipe — iMenu",
};

export default async function EquipePage() {
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
          Seu papel não tem acesso à equipe. Fale com o proprietário ou gerente do estabelecimento.
        </p>
      </div>
    );
  }

  const { members, pendingInvites } = await listTeam(establishmentId);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold text-neutral-950">Equipe</h1>
        <p className="text-sm text-neutral-600">Membros ativos, papéis e convites pendentes.</p>
      </div>

      <InviteForm />

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-neutral-950">Membros ({members.length})</h2>
        <ul className="flex flex-col gap-2">
          {members.map((member) => (
            <li
              key={member.id}
              className="flex flex-col gap-3 rounded-card border border-neutral-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-medium text-neutral-950">
                  {member.displayName}
                  {!member.isActive ? (
                    <span className="ml-2 rounded-chip bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                      Desativado
                    </span>
                  ) : null}
                </p>
                <p className="text-xs text-neutral-600">{member.email}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <form action={updateMemberRoleAction.bind(null, member.id)} className="flex items-center gap-2">
                  <select
                    name="role"
                    defaultValue={member.role}
                    disabled={member.role === "owner"}
                    className="rounded-control border border-neutral-200 px-2 py-1.5 text-xs disabled:bg-neutral-100"
                  >
                    {TEAM_ROLES.map((teamRole) => (
                      <option key={teamRole} value={teamRole}>
                        {MEMBER_ROLE_LABELS[teamRole]}
                      </option>
                    ))}
                  </select>
                  {member.role !== "owner" ? (
                    <button type="submit" className="text-xs font-medium text-primary-700 hover:underline">
                      Salvar
                    </button>
                  ) : null}
                </form>
                {member.role !== "owner" ? (
                  <form action={setMemberActiveAction.bind(null, member.id, !member.isActive)}>
                    <button type="submit" className="text-xs font-medium text-neutral-600 hover:underline">
                      {member.isActive ? "Desativar" : "Reativar"}
                    </button>
                  </form>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {pendingInvites.length > 0 ? (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-neutral-950">Convites pendentes ({pendingInvites.length})</h2>
          <ul className="flex flex-col gap-2">
            {pendingInvites.map((invite) => (
              <li
                key={invite.id}
                className="flex flex-col gap-2 rounded-card border border-neutral-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-neutral-950">{invite.email}</p>
                  <p className="text-xs text-neutral-600">
                    {MEMBER_ROLE_LABELS[invite.role]} · expira em {formatDateTimePtBr(invite.expiresAt)}
                  </p>
                </div>
                <form action={revokeInviteAction.bind(null, invite.id)}>
                  <button type="submit" className="text-xs font-medium text-danger hover:underline">
                    Revogar
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
