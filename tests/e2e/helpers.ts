import type { Page } from "@playwright/test";
import jsQR from "jsqr";

/**
 * Credenciais de demonstração já existentes em `imenu-dev` (D-026),
 * sobrescrevíveis por variável de ambiente. Não são segredos reais — só
 * dão acesso a dados fictícios de demonstração, nunca a dados de produção.
 */
export const OWNER_EMAIL = process.env.E2E_OWNER_EMAIL ?? "owner-cantina@imenu.demo";
export const OWNER_PASSWORD = process.env.E2E_OWNER_PASSWORD ?? "CantinaDemo123!";
export const SUPERADMIN_EMAIL = process.env.E2E_SUPERADMIN_EMAIL ?? "superadmin@imenu.demo";
export const SUPERADMIN_PASSWORD = process.env.E2E_SUPERADMIN_PASSWORD ?? "SuperAdminDemo123!";
export const ESTABLISHMENT_SLUG = process.env.E2E_ESTABLISHMENT_SLUG ?? "cantina-da-nonna";

export async function loginAsOwner(page: Page): Promise<void> {
  await page.goto("/entrar");
  await page.fill("#email", OWNER_EMAIL);
  await page.fill("#password", OWNER_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/painel/);
}

export async function loginAsSuperAdmin(page: Page): Promise<void> {
  await page.goto("/entrar");
  await page.fill("#email", SUPERADMIN_EMAIL);
  await page.fill("#password", SUPERADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/painel/);
  await page.goto("/admin-geral");
}

/** Sufixo curto e único por execução, para nomear entidades de teste sem colidir entre execuções. */
export function uniqueSuffix(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/**
 * Baixa o PNG do QR (autenticado, via a sessão do `page`) e decodifica de
 * verdade — o mesmo caminho que uma câmera de celular percorreria — em vez
 * de ler o token direto do banco. Cobre AC-QR-001 fielmente.
 */
export async function decodeQrPngUrl(page: Page, qrPngUrl: string): Promise<string> {
  const response = await page.request.get(qrPngUrl);
  const buffer = await response.body();

  const imageData = await page.evaluate(async (base64) => {
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: "image/png" });
    const bitmap = await createImageBitmap(blob);
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(bitmap, 0, 0);
    const data = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
    return { data: Array.from(data.data), width: data.width, height: data.height };
  }, buffer.toString("base64"));

  const result = jsQR(Uint8ClampedArray.from(imageData.data), imageData.width, imageData.height);
  if (!result) {
    throw new Error(`Não foi possível decodificar o QR em ${qrPngUrl}`);
  }
  return result.data;
}

/** Extrai só o caminho (`/m/slug/t/token`) de uma URL absoluta ou relativa decodificada do QR. */
export function pathFromDecodedUrl(decoded: string): string {
  return decoded.startsWith("http") ? new URL(decoded).pathname : decoded;
}
