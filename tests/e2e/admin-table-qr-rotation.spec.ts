import { test, expect } from "@playwright/test";
import { loginAsOwner, decodeQrPngUrl, pathFromDecodedUrl, uniqueSuffix } from "./helpers";

/**
 * P0 flow 4 / AC-QR-001 (docs/11 §3, §7): após regenerar, o QR antigo falha
 * e o novo funciona — verificado com os PNGs reais baixados e decodificados
 * antes/depois da regeneração, não com tokens lidos do banco.
 */
test.describe("Regeneração de QR de mesa", () => {
  test("QR antigo passa a falhar; QR novo funciona imediatamente", async ({ page, context }) => {
    const tableName = `E2E QR ${uniqueSuffix()}`;

    await loginAsOwner(page);
    await page.goto("/painel/mesas");
    await page.fill("#name", tableName);
    await page.click('button:has-text("Criar mesa")');
    await page.waitForLoadState("networkidle");

    const tableRow = page.locator("li", { hasText: tableName });
    await tableRow.locator("summary").click();
    const qrHrefBefore = await tableRow.locator('a[href*="/qr"]').first().getAttribute("href");
    if (!qrHrefBefore) throw new Error("QR não encontrado.");
    const decodedBefore = await decodeQrPngUrl(page, qrHrefBefore);
    const oldPublicPath = pathFromDecodedUrl(decodedBefore);

    page.on("dialog", (dialog) => dialog.accept());
    await tableRow.getByRole("button", { name: "Regenerar QR" }).click();
    await page.waitForLoadState("networkidle");

    // O painel já continua aberto depois da revalidação — clicar de novo no
    // <summary> o fecharia (é um toggle), então só reabre se necessário.
    const tableRowAfter = page.locator("li", { hasText: tableName });
    const qrLinkAfter = tableRowAfter.locator('a[href*="/qr"]').first();
    if (!(await qrLinkAfter.isVisible())) {
      await tableRowAfter.locator("summary").click();
    }
    // networkidle acima confirma que a página parou de fazer requisições, mas
    // não garante que a Server Action de regeneração já tenha terminado no
    // servidor (o clique dispara o pedido de forma assíncrona) — sem retry
    // aqui, o download seguinte podia vencer a corrida contra a própria
    // mutação e baixar o QR ainda antigo, mesmo com o token já trocado no
    // banco um instante depois.
    let newPublicPath = "";
    await expect(async () => {
      const qrHrefAfter = await qrLinkAfter.getAttribute("href");
      if (!qrHrefAfter) throw new Error("QR não encontrado após regenerar.");
      const decodedAfter = await decodeQrPngUrl(page, qrHrefAfter);
      newPublicPath = pathFromDecodedUrl(decodedAfter);
      expect(newPublicPath).not.toBe(oldPublicPath);
    }).toPass({ timeout: 10_000 });

    await context.clearCookies();

    await page.goto(oldPublicPath);
    await expect(page.getByText("QR Code inválido")).toBeVisible();

    await page.goto(newPublicPath);
    await expect(page.getByText("QR Code inválido")).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
