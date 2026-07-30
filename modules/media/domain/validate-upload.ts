/**
 * Valida mídia de produto pelo conteúdo real do arquivo (magic bytes), nunca
 * pelo `Content-Type`/extensão informados pelo cliente (docs/10, upload).
 */

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/webm": "webm",
};

function matchesSignature(buffer: Uint8Array, offset: number, signature: number[]): boolean {
  if (buffer.length < offset + signature.length) return false;
  for (let i = 0; i < signature.length; i += 1) {
    if (buffer[offset + i] !== signature[i]) return false;
  }
  return true;
}

/** Detecta o MIME real pelos primeiros bytes do arquivo. */
export function detectMimeFromBuffer(buffer: Uint8Array): string | null {
  if (matchesSignature(buffer, 0, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (matchesSignature(buffer, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (matchesSignature(buffer, 0, [0x52, 0x49, 0x46, 0x46]) && matchesSignature(buffer, 8, [0x57, 0x45, 0x42, 0x50])) {
    return "image/webp";
  }
  if (matchesSignature(buffer, 4, [0x66, 0x74, 0x79, 0x70])) return "video/mp4";
  if (matchesSignature(buffer, 0, [0x1a, 0x45, 0xdf, 0xa3])) return "video/webm";
  return null;
}

export type MediaValidationResult =
  | { ok: true; mimeType: string; kind: "image" | "video"; extension: string }
  | { ok: false; reason: string };

export function validateMediaUpload(buffer: Uint8Array, declaredMimeType: string): MediaValidationResult {
  const detected = detectMimeFromBuffer(buffer);

  if (!detected) {
    return { ok: false, reason: "Tipo de arquivo não reconhecido ou não suportado." };
  }

  if (detected !== declaredMimeType) {
    return { ok: false, reason: "O conteúdo do arquivo não corresponde ao tipo declarado." };
  }

  const isImage = detected.startsWith("image/");
  const maxBytes = isImage ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;

  if (buffer.byteLength === 0) {
    return { ok: false, reason: "Arquivo vazio." };
  }

  if (buffer.byteLength > maxBytes) {
    return {
      ok: false,
      reason: isImage ? "Imagem excede o limite de 5 MB." : "Vídeo excede o limite de 50 MB.",
    };
  }

  return {
    ok: true,
    mimeType: detected,
    kind: isImage ? "image" : "video",
    extension: EXTENSION_BY_MIME[detected],
  };
}
