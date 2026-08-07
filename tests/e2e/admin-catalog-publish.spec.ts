import { test, expect } from "@playwright/test";
import { loginAsOwner, decodeQrPngUrl, pathFromDecodedUrl, uniqueSuffix } from "./helpers";

/**
 * P0 flow 3 (docs/11 §7): owner → produto → mídia → publicação → menu.
 * Cobre AC-CAT-001: rascunho nunca aparece no cardápio público; depois de
 * publicado, aparece sem precisar de novo deploy (revalidação normal do
 * Next.js + leitura direta do banco a cada requisição pública).
 */
test.describe("Publicação de produto", () => {
  test("rascunho não aparece no cardápio público; após publicar, aparece", async ({ page }) => {
    const suffix = uniqueSuffix();
    const categoryName = `E2E Categoria ${suffix}`;
    const productName = `E2E Produto ${suffix}`;

    await loginAsOwner(page);

    await page.goto("/painel/cardapio/categorias");
    await page.fill("#name", categoryName);
    await page.click('button:has-text("Criar categoria")');
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(categoryName)).toBeVisible();

    await page.goto("/painel/cardapio/produtos");
    await page.fill("#name", productName);
    await page.selectOption("#categoryId", { label: categoryName });
    await page.fill("#basePriceCents", "1234");
    await page.fill("#shortDescription", "Descrição curta de teste E2E.");
    await page.click('button:has-text("Criar rascunho")');
    await page.waitForURL(/\/painel\/cardapio\/produtos\/[a-f0-9-]+/);
    await expect(page.getByText("Rascunho")).toBeVisible();

    // Pega o QR de uma mesa existente para checar o cardápio público.
    await page.goto("/painel/mesas");
    const qrHref = await page.locator('a[href*="/qr"]').first().getAttribute("href");
    if (!qrHref) throw new Error("Nenhuma mesa com QR encontrada.");
    const decoded = await decodeQrPngUrl(page, qrHref);
    const publicPath = pathFromDecodedUrl(decoded);

    const publicContext = await page.context().browser()!.newContext();
    const publicPage = await publicContext.newPage();
    await publicPage.goto(publicPath);
    await expect(publicPage.getByText(productName)).toHaveCount(0);

    // Volta e publica.
    await page.goBack();
    await page.getByRole("button", { name: "Publicar produto" }).click();
    await expect(page.getByText("Publicado")).toBeVisible({ timeout: 10_000 });

    await publicPage.reload();
    await expect(publicPage.getByText(productName)).toBeVisible({ timeout: 10_000 });

    await publicContext.close();
  });
});
