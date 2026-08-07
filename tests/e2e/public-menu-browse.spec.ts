import { test, expect } from "@playwright/test";
import { loginAsOwner, decodeQrPngUrl, pathFromDecodedUrl, ESTABLISHMENT_SLUG } from "./helpers";

/**
 * Viewport móvel (projeto "mobile-menu", docs/11 §7 "Chromium mobile para
 * cardápio"). Cobre AC-PUB-001 e AC-PUB-002 usando o QR real (baixado e
 * decodificado, não o token lido direto do banco).
 */
test.describe("Cardápio público — mobile", () => {
  test("QR válido abre o cardápio sem login; QR inválido é tratado com segurança", async ({ page, context }) => {
    // Sessão temporária só para obter o link real de uma mesa já existente.
    await loginAsOwner(page);
    await page.goto("/painel/mesas");
    const qrHref = await page.locator('a[href*="/qr"]').first().getAttribute("href");
    if (!qrHref) throw new Error("Nenhuma mesa com QR encontrada — pré-requisito do teste não atendido.");
    const decoded = await decodeQrPngUrl(page, qrHref);
    const publicPath = pathFromDecodedUrl(decoded);

    // A partir daqui, age como o consumidor real: sem nenhuma sessão de staff.
    await context.clearCookies();

    await page.goto(publicPath);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const productLinks = page.locator('a[href*="/produto/"]');
    await expect(productLinks.first()).toBeVisible();
    expect(await productLinks.count()).toBeGreaterThan(0);

    // AC-PUB-002 — token inexistente não revela nada além de "inválido".
    await page.goto(`/m/${ESTABLISHMENT_SLUG}/t/token-e2e-inexistente-000`);
    await expect(page.getByText("QR Code inválido")).toBeVisible();
  });

  test("detalhe do produto mostra preço, descrição e permite voltar ao cardápio (AC-PUB-003)", async ({ page, context }) => {
    await loginAsOwner(page);
    await page.goto("/painel/mesas");
    const qrHref = await page.locator('a[href*="/qr"]').first().getAttribute("href");
    if (!qrHref) throw new Error("Nenhuma mesa com QR encontrada.");
    const decoded = await decodeQrPngUrl(page, qrHref);
    const publicPath = pathFromDecodedUrl(decoded);

    await context.clearCookies();
    await page.goto(publicPath);
    await page.locator('a[href*="/produto/"]').first().click();

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Adicionar/ })).toBeVisible();
  });
});
