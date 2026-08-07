import { test, expect } from "@playwright/test";
import { loginAsOwner, loginAsSuperAdmin } from "./helpers";

/**
 * P0 flow 6 / AC-TEN-001 (docs/11 §3, §7): tenant A não acessa tenant B nem
 * manipulando cookie/URL. Como o owner de teste só tem um vínculo real,
 * forjar o cookie `imenu_active_establishment` para outro estabelecimento
 * precisa cair de volta no próprio tenant (ou em "nenhum vínculo") — nunca
 * abrir o painel do estabelecimento alheio (`resolve-active-establishment.ts`
 * revalida a associação real a cada requisição, nunca confia no cookie).
 */
test.describe("Isolamento entre tenants", () => {
  test("cookie forjado para outro estabelecimento nunca abre o painel alheio", async ({ browser }) => {
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    await loginAsSuperAdmin(adminPage);
    await adminPage.goto("/admin-geral/estabelecimentos");

    const rows = adminPage.locator("table tbody tr");
    const rowCount = await rows.count();
    let foreignId: string | null = null;
    let foreignName: string | null = null;
    for (let i = 0; i < rowCount; i += 1) {
      const link = rows.nth(i).locator("a").first();
      const text = (await link.textContent())?.trim() ?? "";
      const href = await link.getAttribute("href");
      if (href && !text.toLowerCase().includes("cantina")) {
        foreignId = href.split("/").pop() ?? null;
        foreignName = text;
        break;
      }
    }
    await adminContext.close();

    test.skip(!foreignId, "Precisa de pelo menos um segundo estabelecimento cadastrado para testar isolamento.");

    const ownerContext = await browser.newContext();
    const ownerPage = await ownerContext.newPage();
    await loginAsOwner(ownerPage);

    await ownerContext.addCookies([
      {
        name: "imenu_active_establishment",
        value: foreignId!,
        url: new URL(ownerPage.url()).origin,
      },
    ]);

    await ownerPage.goto("/painel");
    await expect(ownerPage.getByText(foreignName!)).toHaveCount(0);

    // Revalidação real: ou volta pro próprio tenant, ou pede seleção — nunca entra no alheio.
    const ownEstablishmentHeading = ownerPage.getByRole("heading", { name: /painel de/i });
    const selectionScreen = ownerPage.getByText("Selecione um estabelecimento");
    await expect(ownEstablishmentHeading.or(selectionScreen)).toBeVisible();

    await ownerContext.close();
  });
});
