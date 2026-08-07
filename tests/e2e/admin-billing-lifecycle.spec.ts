import { readFileSync, existsSync } from "node:fs";
import { test, expect } from "@playwright/test";
import { loginAsOwner, loginAsSuperAdmin, ESTABLISHMENT_SLUG } from "./helpers";

function loadDotEnvLocal(): void {
  if (!existsSync(".env.local")) return;
  const raw = readFileSync(".env.local", "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && process.env[match[1]] === undefined) {
      process.env[match[1]] = match[2];
    }
  }
}
loadDotEnvLocal();

const CRON_SECRET = process.env.CRON_SECRET;
const HAS_SERVICE_ROLE_KEY = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/**
 * P0 flow 5 (docs/11 §7): superadmin → fatura → atraso → suspensão →
 * pagamento → reativação. Cobre AC-SUB-001, AC-SUB-002 (preservação de
 * dados) e AC-SUB-003. Cria sua própria fatura com vencimento no passado em
 * vez de depender de dados pré-existentes; ao final, o tenant volta a
 * `active` — não deixa o estabelecimento compartilhado suspenso para os
 * outros testes.
 */
test.describe("Ciclo de assinatura", () => {
  test.skip(!CRON_SECRET, "CRON_SECRET ausente do ambiente — não é possível acionar o job de inadimplência.");
  // O endpoint de cron usa o cliente service role internamente (lib/supabase/admin.ts)
  // — mesmo bloqueio externo documentado desde a Fase 0/2/8 (status/IMPLEMENTATION_STATUS.md).
  test.skip(!HAS_SERVICE_ROLE_KEY, "SUPABASE_SERVICE_ROLE_KEY ausente — job de inadimplência não pode rodar.");

  test("fatura vencida suspende o serviço; pagamento confirmado reativa", async ({ browser }) => {
    const distinctiveAmountCents = 1234;
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    // Início do período varia por execução (40-99 dias atrás) para nunca colidir com a
    // constraint unique(subscription_id, reference_period_start, reference_period_end)
    // de uma fatura de teste anterior no mesmo dia.
    const periodStartDaysAgo = 40 + (Date.now() % 60);
    const periodStart = new Date(Date.now() - periodStartDaysAgo * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    await loginAsSuperAdmin(adminPage);

    await adminPage.goto("/admin-geral/estabelecimentos");
    const cantinaLink = adminPage.locator("table tbody tr a", { hasText: /cantina/i }).first();
    await cantinaLink.click();
    await adminPage.waitForLoadState("networkidle");
    const establishmentUrl = adminPage.url();

    await adminPage.fill("#referencePeriodStart", periodStart);
    await adminPage.fill("#referencePeriodEnd", yesterday);
    await adminPage.fill("#dueAt", yesterday);
    await adminPage.fill("#amountCents", String(distinctiveAmountCents));
    await adminPage.click('button:has-text("Criar fatura")');
    await adminPage.waitForLoadState("networkidle");
    await expect(adminPage.getByText("R$ 12,34").first()).toBeVisible();

    // Job de inadimplência (docs/09 §5) — mesmo endpoint que o scheduler real chama.
    const cronResponse = await adminPage.request.post(`${BASE_URL}/api/internal/cron/process-overdue-subscriptions`, {
      headers: { "x-cron-secret": CRON_SECRET! },
    });
    expect(cronResponse.ok()).toBeTruthy();

    // AC-SUB-001 — owner bloqueado operacionalmente, mas a assinatura continua acessível (docs/09 §10).
    const ownerContext = await browser.newContext();
    const ownerPage = await ownerContext.newPage();
    await loginAsOwner(ownerPage);
    await ownerPage.goto("/painel");
    await expect(ownerPage.getByRole("heading", { name: "Acesso operacional indisponível" })).toBeVisible({
      timeout: 10_000,
    });

    // AC-SUB-002 — consumidor não vê menção a inadimplência, e o cardápio/dados continuam existindo (mensagem neutra).
    const publicContext = await browser.newContext();
    const publicPage = await publicContext.newPage();
    await publicPage.goto(`/m/${ESTABLISHMENT_SLUG}/t/qualquer-token-e2e`);
    await expect(publicPage.getByRole("heading", { name: "Cardápio temporariamente indisponível" })).toBeVisible();
    await expect(publicPage.getByText(/inadimpl|atraso|vencid/i)).toHaveCount(0);
    await publicContext.close();

    // Superadmin confirma o pagamento integral.
    await adminPage.goto(establishmentUrl);
    const invoiceCard = adminPage.locator(".rounded-card", { hasText: "R$ 12,34" }).first();
    await invoiceCard.getByRole("button", { name: "Confirmar pagamento" }).click();
    await adminPage.waitForLoadState("networkidle");

    // AC-SUB-003 — reativado, cardápio/histórico preservados (mesmo estabelecimento, mesmos dados).
    await ownerPage.goto("/painel");
    await expect(ownerPage.getByRole("heading", { name: "Acesso operacional indisponível" })).toHaveCount(0, {
      timeout: 10_000,
    });

    await adminContext.close();
    await ownerContext.close();
  });
});
