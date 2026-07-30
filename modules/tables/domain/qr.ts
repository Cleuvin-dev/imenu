import "server-only";
import QRCode from "qrcode";

/** URL pública da mesa, conforme docs/05 §7. */
export function buildTableUrl(appUrl: string, establishmentSlug: string, tableToken: string): string {
  return `${appUrl}/m/${establishmentSlug}/t/${tableToken}`;
}

export async function generateTableQrPng(url: string): Promise<Buffer> {
  return QRCode.toBuffer(url, { type: "png", errorCorrectionLevel: "M", margin: 2, width: 512 });
}

export async function generateTableQrSvg(url: string): Promise<string> {
  return QRCode.toString(url, { type: "svg", errorCorrectionLevel: "M", margin: 2 });
}
