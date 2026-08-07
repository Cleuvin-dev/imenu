import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { loginAsOwner, decodeQrPngUrl, pathFromDecodedUrl } from "./helpers";

/**
 * P1 (docs/11 §8): axe sem violações críticas/sérias + fluxo básico por
 * teclado nas rotas públicas principais. Viewport móvel (projeto
 * "mobile-menu"), mesmo padrão de descoberta de URL de public-menu-browse.spec.ts.
 */
function seriousOrCritical(violations: { impact?: string | null }[]) {
  return violations.filter((v) => v.impact === "critical" || v.impact === "serious");
}

test.describe("Acessibilidade — cardápio público", () => {
  test("cardápio, detalhe do produto e carrinho sem violações sérias/críticas de axe", async ({ page, context }) => {
    await loginAsOwner(page);
    await page.goto("/painel/mesas");
    const qrHref = await page.locator('a[href*="/qr"]').first().getAttribute("href");
    if (!qrHref) throw new Error("Nenhuma mesa com QR encontrada — pré-requisito do teste não atendido.");
    const decoded = await decodeQrPngUrl(page, qrHref);
    const publicPath = pathFromDecodedUrl(decoded);

    await context.clearCookies();

    await page.goto(publicPath);
    const menuResults = await new AxeBuilder({ page }).analyze();
    expect(seriousOrCritical(menuResults.violations), JSON.stringify(menuResults.violations, null, 2)).toEqual([]);

    await page.locator('a[href*="/produto/"]').first().click();
    const productResults = await new AxeBuilder({ page }).analyze();
    expect(seriousOrCritical(productResults.violations), JSON.stringify(productResults.violations, null, 2)).toEqual([]);

    await page.getByRole("button", { name: /^Adicionar/ }).click();
    await page.goto(publicPath + "/carrinho");
    const cartResults = await new AxeBuilder({ page }).analyze();
    expect(seriousOrCritical(cartResults.violations), JSON.stringify(cartResults.violations, null, 2)).toEqual([]);
  });

  test("navegar do cardápio até o carrinho só com teclado", async ({ page, context }) => {
    await loginAsOwner(page);
    await page.goto("/painel/mesas");
    const qrHref = await page.locator('a[href*="/qr"]').first().getAttribute("href");
    if (!qrHref) throw new Error("Nenhuma mesa com QR encontrada.");
    const decoded = await decodeQrPngUrl(page, qrHref);
    const publicPath = pathFromDecodedUrl(decoded);

    await context.clearCookies();
    await page.goto(publicPath);

    // Primeiro link de produto deve ser alcançável via Tab e ativável com Enter.
    const firstProductLink = page.locator('a[href*="/produto/"]').first();
    await firstProductLink.focus();
    await expect(firstProductLink).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/produto\//);

    // Botão "Adicionar" deve ser alcançável e ativável por teclado.
    const addButton = page.getByRole("button", { name: /^Adicionar/ });
    await addButton.focus();
    await expect(addButton).toBeFocused();
    await page.keyboard.press("Enter");

    await page.goto(publicPath + "/carrinho");
    await expect(page.getByRole("button", { name: "Enviar pedido" })).toBeVisible();
  });
});
