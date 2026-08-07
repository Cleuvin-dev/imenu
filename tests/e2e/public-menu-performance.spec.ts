import { test } from "@playwright/test";
import { loginAsOwner, decodeQrPngUrl, pathFromDecodedUrl } from "./helpers";

/**
 * Baseline de performance do cardápio público (docs/11 §9) — registra
 * métricas reais (não falsifica uma meta em ambiente instável, conforme a
 * própria seção pede) para consulta em status/IMPLEMENTATION_STATUS.md.
 * Viewport móvel (projeto "mobile-menu"), mesmo padrão de descoberta de URL
 * de public-menu-browse.spec.ts. Sem asserção de limite: só coleta e imprime.
 */
test.describe("Baseline de performance — cardápio público", () => {
  test("LCP e payload de imagens da primeira renderização", async ({ page, context }) => {
    await loginAsOwner(page);
    await page.goto("/painel/mesas");
    const qrHref = await page.locator('a[href*="/qr"]').first().getAttribute("href");
    if (!qrHref) throw new Error("Nenhuma mesa com QR encontrada — pré-requisito do teste não atendido.");
    const decoded = await decodeQrPngUrl(page, qrHref);
    const publicPath = pathFromDecodedUrl(decoded);

    await context.clearCookies();

    // Observer instalado antes da navegação para capturar o LCP real da
    // primeira renderização (não uma revisita já aquecida).
    await page.addInitScript(() => {
      (window as unknown as { __lcp: number }).__lcp = 0;
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1];
        if (last) (window as unknown as { __lcp: number }).__lcp = last.startTime;
      }).observe({ type: "largest-contentful-paint", buffered: true });
    });

    const start = Date.now();
    await page.goto(publicPath, { waitUntil: "load" });
    const wallClockLoadMs = Date.now() - start;

    // Força o LCP a "fechar" (só finaliza ao trocar de aba/interação real);
    // simulamos isso com um pequeno scroll, prática comum para leitura em teste.
    await page.mouse.wheel(0, 200);
    await page.waitForTimeout(500);

    const lcp = await page.evaluate(() => (window as unknown as { __lcp: number }).__lcp);

    const resources = await page.evaluate(() =>
      performance.getEntriesByType("resource").map((r) => ({
        name: r.name,
        type: (r as PerformanceResourceTiming).initiatorType,
        transferSize: (r as PerformanceResourceTiming).transferSize,
        duration: Math.round(r.duration),
      })),
    );
    const images = resources.filter((r) => r.type === "img");
    const totalImageBytes = images.reduce((sum, r) => sum + (r.transferSize ?? 0), 0);
    const videos = resources.filter((r) => /\.(mp4|webm)$/i.test(r.name));

    console.log(
      "[PERF BASELINE cardápio público]",
      JSON.stringify(
        {
          url: publicPath,
          wallClockLoadMs,
          lcpMs: Math.round(lcp),
          imageCount: images.length,
          totalImageBytesApprox: totalImageBytes,
          videosEagerlyLoadedInListing: videos.length,
        },
        null,
        2,
      ),
    );
  });
});
