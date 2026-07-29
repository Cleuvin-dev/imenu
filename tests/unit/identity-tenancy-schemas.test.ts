import { describe, expect, it } from "vitest";
import { loginSchema } from "@/modules/identity/schemas/login.schema";
import { selectEstablishmentSchema } from "@/modules/tenancy/schemas/select-establishment.schema";
import { MEMBER_ROLE_LABELS } from "@/modules/tenancy/domain/member-role-labels";
import { PLATFORM_ROLE_LABELS } from "@/modules/platform-admin/domain/platform-role-labels";
import type { Database } from "@/lib/supabase/database-types";

describe("loginSchema", () => {
  it("aceita e-mail e senha válidos", () => {
    const result = loginSchema.safeParse({ email: "owner@imenu.test", password: "12345678" });
    expect(result.success).toBe(true);
  });

  it("rejeita e-mail inválido", () => {
    const result = loginSchema.safeParse({ email: "não-é-email", password: "12345678" });
    expect(result.success).toBe(false);
  });

  it("rejeita senha curta", () => {
    const result = loginSchema.safeParse({ email: "owner@imenu.test", password: "123" });
    expect(result.success).toBe(false);
  });
});

describe("selectEstablishmentSchema", () => {
  it("aceita um uuid válido", () => {
    const result = selectEstablishmentSchema.safeParse({
      establishmentId: "11111111-1111-4111-8111-111111111111",
    });
    expect(result.success).toBe(true);
  });

  it("rejeita um id que não é uuid", () => {
    const result = selectEstablishmentSchema.safeParse({ establishmentId: "não-é-uuid" });
    expect(result.success).toBe(false);
  });
});

describe("rótulos de papel", () => {
  it("cobre todos os valores do enum member_role", () => {
    const roles: Database["public"]["Enums"]["member_role"][] = [
      "owner",
      "manager",
      "menu_editor",
      "kitchen",
      "cashier",
      "viewer",
    ];
    for (const role of roles) {
      expect(MEMBER_ROLE_LABELS[role]).toBeTruthy();
    }
  });

  it("cobre todos os valores do enum platform_role", () => {
    const roles: Database["public"]["Enums"]["platform_role"][] = [
      "super_admin",
      "platform_admin",
      "platform_support",
    ];
    for (const role of roles) {
      expect(PLATFORM_ROLE_LABELS[role]).toBeTruthy();
    }
  });
});
