import { test, expect } from "@playwright/test";
import { loginAsOwner, decodeQrPngUrl, pathFromDecodedUrl, uniqueSuffix } from "./helpers";

/**
 * P0 flow 2 (docs/11 §7): pedido → conta → fechamento da mesa. Cobre
 * AC-BILL-001 (aparece no caixa em tempo real, reconhecida, entregue,
 * fecha a sessão) usando fechamento forçado, já que o pedido criado não é
 * levado a um status terminal neste teste (docs/03 regra 5/8, D-031).
 */
test.describe("Conta e fechamento da mesa", () => {
  test("solicitar conta → reconhecer → entregar → fechar sessão", async ({ browser }) => {
    // Fluxo longo e sequencial contra um backend real (criar mesa, pedido,
    // solicitar conta, duas transições e o fechamento) — o timeout padrão de
    // 30s de um único teste some rápido somando as esperas de cada etapa,
    // mesmo quando cada etapa individual é rápida.
    test.setTimeout(90_000);

    const tableName = `E2E Conta ${uniqueSuffix()}`;

    const staffContext = await browser.newContext();
    const staffPage = await staffContext.newPage();
    await loginAsOwner(staffPage);

    await staffPage.goto("/painel/mesas");
    await staffPage.fill("#name", tableName);
    await staffPage.click('button:has-text("Criar mesa")');
    await staffPage.waitForLoadState("networkidle");

    const tableRow = staffPage.locator("li", { hasText: tableName });
    await tableRow.locator("summary").click();
    const qrHref = await tableRow.locator('a[href*="/qr"]').first().getAttribute("href");
    if (!qrHref) throw new Error("QR da mesa recém-criada não encontrado.");
    const decoded = await decodeQrPngUrl(staffPage, qrHref);
    const publicPath = pathFromDecodedUrl(decoded);

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
    await consumerPage.getByRole("button", { name: "Enviar pedido" }).click();
    await consumerPage.waitForURL(/\/pedido\//, { timeout: 15_000 });

    // Consumidor solicita a conta.
    await consumerPage.goto(publicPath + "/conta");
    await consumerPage.getByRole("button", { name: "Solicitar conta" }).click();
    await expect(consumerPage.getByText("Recebida")).toBeVisible({ timeout: 10_000 });

    // Caixa: aparece em tempo real, reconhece e marca como entregue.
    await staffPage.goto("/painel/caixa");
    const billCard = staffPage.locator("article", { hasText: tableName });
    await expect(billCard).toBeVisible({ timeout: 10_000 });

    await billCard.getByRole("button", { name: "Reconhecer" }).click();
    await expect(consumerPage.getByText("Visualizada")).toBeVisible({ timeout: 15_000 });

    await billCard.getByRole("button", { name: "Marcar conta entregue" }).click();
    await expect(consumerPage.getByText("Atendida")).toBeVisible({ timeout: 15_000 });

    // Fechamento: o pedido criado ainda está pendente, então a tentativa simples
    // pede confirmação de força (docs/03 regra 8, D-031).
    await staffPage.goto("/painel/caixa");
    const billCardAfter = staffPage.locator("article", { hasText: tableName });
    await billCardAfter.getByRole("button", { name: /Fechar sessão/ }).click();
    await expect(billCardAfter.getByRole("button", { name: /Forçar fechamento/ })).toBeVisible();
    await billCardAfter.getByRole("button", { name: /Forçar fechamento/ }).click();
    await billCardAfter.getByRole("button", { name: /Fechar sessão/ }).click();

    // Não usar waitForLoadState("networkidle") aqui: a página do caixa mantém
    // uma conexão WebSocket (Realtime) e polling em segundo plano, então a
    // rede nunca fica "ociosa" — a asserção abaixo já tem retry embutido.
    await expect(staffPage.locator("article", { hasText: tableName })).toHaveCount(0, { timeout: 15_000 });

    await staffContext.close();
    await consumerContext.close();
  });
});
