import { describe, expect, it } from "vitest";
import { upsertBusinessHourSchema, upsertBusinessHourExceptionSchema } from "@/modules/catalog/schemas/business-hours.schema";
import { createInviteSchema } from "@/modules/tenancy/schemas/create-invite.schema";
import { updateMemberSchema } from "@/modules/tenancy/schemas/update-member.schema";
import { createPlanSchema, updatePlanSchema } from "@/modules/billing/schemas/plan.schema";
import { auditActionLabel, AUDIT_ACTION_LABELS } from "@/modules/audit/domain/action-labels";

describe("upsertBusinessHourSchema", () => {
  it("aceita um dia aberto com abertura antes do fechamento", () => {
    const result = upsertBusinessHourSchema.safeParse({ weekday: 1, isClosed: false, opensAt: "09:00", closesAt: "18:00" });
    expect(result.success).toBe(true);
  });

  it("dia fechado dispensa horário de abertura/fechamento", () => {
    const result = upsertBusinessHourSchema.safeParse({ weekday: 0, isClosed: true, opensAt: null, closesAt: null });
    expect(result.success).toBe(true);
  });

  it("rejeita fechamento antes ou igual à abertura", () => {
    const result = upsertBusinessHourSchema.safeParse({ weekday: 1, isClosed: false, opensAt: "18:00", closesAt: "09:00" });
    expect(result.success).toBe(false);
  });

  it("rejeita formato de horário inválido", () => {
    const result = upsertBusinessHourSchema.safeParse({ weekday: 1, isClosed: false, opensAt: "9h", closesAt: "18:00" });
    expect(result.success).toBe(false);
  });

  it("rejeita weekday fora de 0-6", () => {
    const result = upsertBusinessHourSchema.safeParse({ weekday: 7, isClosed: true, opensAt: null, closesAt: null });
    expect(result.success).toBe(false);
  });
});

describe("upsertBusinessHourExceptionSchema", () => {
  it("exige data no formato AAAA-MM-DD", () => {
    const result = upsertBusinessHourExceptionSchema.safeParse({
      date: "25/12/2026",
      isClosed: true,
      opensAt: null,
      closesAt: null,
    });
    expect(result.success).toBe(false);
  });

  it("aceita exceção fechada com nota opcional", () => {
    const result = upsertBusinessHourExceptionSchema.safeParse({
      date: "2026-12-25",
      isClosed: true,
      opensAt: null,
      closesAt: null,
      note: "Natal",
    });
    expect(result.success).toBe(true);
  });
});

describe("createInviteSchema", () => {
  it("aceita e-mail válido e papel conhecido", () => {
    expect(createInviteSchema.safeParse({ email: "equipe@imenu.test", role: "manager" }).success).toBe(true);
  });

  it("rejeita papel desconhecido", () => {
    expect(createInviteSchema.safeParse({ email: "equipe@imenu.test", role: "super_admin" }).success).toBe(false);
  });

  it("rejeita e-mail inválido", () => {
    expect(createInviteSchema.safeParse({ email: "não-é-email", role: "viewer" }).success).toBe(false);
  });
});

describe("updateMemberSchema", () => {
  it("aceita só o papel", () => {
    expect(updateMemberSchema.safeParse({ role: "cashier" }).success).toBe(true);
  });

  it("aceita só a ativação", () => {
    expect(updateMemberSchema.safeParse({ isActive: false }).success).toBe(true);
  });

  it("aceita objeto vazio (a checagem de 'ao menos um campo' é feita na aplicação, não no schema)", () => {
    expect(updateMemberSchema.safeParse({}).success).toBe(true);
  });
});

describe("createPlanSchema / updatePlanSchema", () => {
  it("aceita um código em kebab-case", () => {
    const result = createPlanSchema.safeParse({
      code: "essencial-2026",
      name: "Essencial",
      priceCents: 9900,
      billingIntervalMonths: 1,
      isActive: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejeita código com maiúsculas ou espaços", () => {
    expect(
      createPlanSchema.safeParse({
        code: "Plano Essencial",
        name: "Essencial",
        priceCents: 9900,
        billingIntervalMonths: 1,
        isActive: true,
      }).success,
    ).toBe(false);
  });

  it("rejeita preço negativo", () => {
    expect(
      createPlanSchema.safeParse({
        code: "essencial",
        name: "Essencial",
        priceCents: -100,
        billingIntervalMonths: 1,
        isActive: true,
      }).success,
    ).toBe(false);
  });

  it("updatePlanSchema não aceita/exige código (identidade estável do plano)", () => {
    const result = updatePlanSchema.safeParse({
      name: "Essencial",
      priceCents: 9900,
      billingIntervalMonths: 1,
      isActive: true,
    });
    expect(result.success).toBe(true);
    expect("code" in (result.success ? result.data : {})).toBe(false);
  });
});

describe("auditActionLabel", () => {
  it("traduz ações conhecidas", () => {
    expect(auditActionLabel("payment.confirm")).toBe(AUDIT_ACTION_LABELS["payment.confirm"]);
  });

  it("cai no texto bruto para ações desconhecidas (nunca esconde um evento novo)", () => {
    expect(auditActionLabel("nova.acao.inexistente")).toBe("nova.acao.inexistente");
  });
});
