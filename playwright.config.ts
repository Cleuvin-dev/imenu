import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  // Estes testes rodam contra um backend real e compartilhado (imenu-dev),
  // não um banco isolado por teste — criar um projeto Supabase efêmero por
  // execução exigiria SUPABASE_SERVICE_ROLE_KEY, que continua bloqueada
  // (status/IMPLEMENTATION_STATUS.md). Paralelismo real faria testes
  // pisarem nos dados uns dos outros (ex.: o teste de assinatura suspende
  // temporariamente o mesmo tenant que os testes de pedido/catálogo
  // precisam ativo). `workers: 1` força execução sequencial de ponta a
  // ponta até existir isolamento por execução.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["html", { open: "never" }]],
  use: {
    baseURL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "mobile-menu",
      use: { ...devices["Pixel 7"] },
      testMatch: /public-menu.*\.spec\.ts/,
    },
    {
      name: "desktop-admin",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /(operations|admin).*\.spec\.ts/,
    },
  ],
  webServer: {
    command: "npm run build && npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
