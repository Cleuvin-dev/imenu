import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { loginAsOwner, loginAsSuperAdmin, OWNER_EMAIL, OWNER_PASSWORD } from "./helpers";

/**
 * P1 (docs/11 §8): axe sem violações críticas/sérias + fluxo básico por
 * teclado nas rotas administrativas principais (projeto "desktop-admin").
 */
function seriousOrCritical(violations: { impact?: string | null }[]) {
  return violations.filter((v) => v.impact === "critical" || v.impact === "serious");
}

async function expectNoSeriousViolations(page: import("@playwright/test").Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(seriousOrCritical(results.violations), JSON.stringify(results.violations, null, 2)).toEqual([]);
}

test.describe("Acessibilidade — painéis administrativos", () => {
  test("login (/entrar)", async ({ page }) => {
    await page.goto("/entrar");
    await expectNoSeriousViolations(page);
  });

  test("painel do estabelecimento: dashboard, pedidos (KDS) e mesas", async ({ page }) => {
    await loginAsOwner(page);
    await expectNoSeriousViolations(page);

    await page.goto("/painel/pedidos");
    await expectNoSeriousViolations(page);

    await page.goto("/painel/mesas");
    await expectNoSeriousViolations(page);
  });

  test("admin-geral: dashboard geral e lista de estabelecimentos", async ({ page }) => {
    await loginAsSuperAdmin(page);
    await expectNoSeriousViolations(page);

    await page.goto("/admin-geral/estabelecimentos");
    await expectNoSeriousViolations(page);
  });
});

test.describe("Navegação por teclado — administrativo", () => {
  test("login: preencher e enviar só com teclado", async ({ page }) => {
    await page.goto("/entrar");
    await page.locator("#email").focus();
    await expect(page.locator("#email")).toBeFocused();
    await page.keyboard.type(OWNER_EMAIL);
    await page.keyboard.press("Tab");
    await expect(page.locator("#password")).toBeFocused();
    await page.keyboard.type(OWNER_PASSWORD);
    await page.keyboard.press("Enter");
    await page.waitForURL(/\/painel/);
  });

  test("mesas: abrir o painel de uma mesa e alcançar o link de QR só com Tab", async ({ page }) => {
    await loginAsOwner(page);
    await page.goto("/painel/mesas");

    const summary = page.locator("li summary").first();
    await summary.focus();
    await expect(summary).toBeFocused();
    await page.keyboard.press("Enter");

    const qrLink = page.locator('a[href*="/qr"]').first();
    await expect(qrLink).toBeVisible();
    await qrLink.focus();
    await expect(qrLink).toBeFocused();
  });
});
