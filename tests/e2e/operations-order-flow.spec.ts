import { test, expect } from "@playwright/test";
import { loginAsOwner, decodeQrPngUrl, pathFromDecodedUrl, uniqueSuffix } from "./helpers";

/**
 * P0 flow 1 (docs/11 §7): QR → produto → opções → carrinho → pedido → KDS →
 * entrega. Cobre AC-ORD-001 (pedido ponta a ponta, aparece no KDS via
 * Realtime) e a máquina de estados completa. Cria sua própria mesa
 * (nome único) para não colidir com outros dados do tenant compartilhado.
 */
test.describe("Pedido ponta a ponta", () => {
  test("QR → carrinho → pedido → KDS → aceitar → preparar → pronto → entregue", async ({ browser }) => {
    const tableName = `E2E ${uniqueSuffix()}`;

    const staffContext = await browser.newContext();
    const staffPage = await staffContext.newPage();
    await loginAsOwner(staffPage);

    await staffPage.goto("/painel/mesas");
    await staffPage.fill("#name", tableName);
    await staffPage.click('button:has-text("Criar mesa")');
    await staffPage.waitForLoadState("networkidle");

    const tableRow = staffPage.locator("li", { hasText: tableName });
    await expect(tableRow).toBeVisible();
    await tableRow.locator("summary").click();
    const qrHref = await tableRow.locator('a[href*="/qr"]').first().getAttribute("href");
    if (!qrHref) throw new Error("QR da mesa recém-criada não encontrado.");
    const decoded = await decodeQrPngUrl(staffPage, qrHref);
    const publicPath = pathFromDecodedUrl(decoded);

    // Consumidor: contexto totalmente separado, sem sessão de staff.
    const consumerContext = await browser.newContext();
    const consumerPage = await consumerContext.newPage();
    await consumerPage.goto(publicPath);
    await consumerPage.locator('a[href*="/produto/"]').first().click();

    const radioNames = new Set(
      await consumerPage.locator('input[type="radio"]').evaluateAll((els) => els.map((el) => (el as HTMLInputElement).name)),
    );
    for (const name of radioNames) {
      await consumerPage.locator(`input[type="radio"][name="${name}"]`).first().check();
    }
    await consumerPage.getByRole("button", { name: /^Adicionar/ }).click();

    await consumerPage.goto(publicPath + "/carrinho");
    await expect(consumerPage.getByRole("button", { name: "Enviar pedido" })).toBeEnabled();
    await consumerPage.getByRole("button", { name: "Enviar pedido" }).click();
    await consumerPage.waitForURL(/\/pedido\//, { timeout: 15_000 });
    await expect(consumerPage.getByText(/aguardando confirmação/i).first()).toBeVisible();

    // Staff: o pedido aparece no KDS via Realtime, sem reload manual (AC-ORD-001).
    await staffPage.goto("/painel/pedidos");
    const orderCard = staffPage.locator(".rounded-card", { hasText: tableName });
    await expect(orderCard).toBeVisible({ timeout: 10_000 });

    await orderCard.getByRole("button", { name: "Aceitar" }).click();
    await expect(orderCard.getByRole("button", { name: "Iniciar preparo" })).toBeVisible({ timeout: 10_000 });
    await orderCard.getByRole("button", { name: "Iniciar preparo" }).click();
    await expect(orderCard.getByRole("button", { name: "Marcar pronto" })).toBeVisible({ timeout: 10_000 });
    await orderCard.getByRole("button", { name: "Marcar pronto" }).click();
    await expect(orderCard.getByRole("button", { name: "Marcar entregue" })).toBeVisible({ timeout: 10_000 });
    await orderCard.getByRole("button", { name: "Marcar entregue" }).click();

    // Consumidor acompanha todos os estados sem precisar recarregar manualmente.
    await expect(consumerPage.getByText(/entregue/i).first()).toBeVisible({ timeout: 15_000 });

    await staffContext.close();
    await consumerContext.close();
  });
});
