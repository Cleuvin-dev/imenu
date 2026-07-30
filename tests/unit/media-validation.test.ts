import { describe, expect, it } from "vitest";
import { detectMimeFromBuffer, validateMediaUpload } from "@/modules/media/domain/validate-upload";

function bytes(...values: number[]): Uint8Array {
  return new Uint8Array(values);
}

function padded(signature: number[], totalSize: number): Uint8Array {
  const buffer = new Uint8Array(totalSize);
  buffer.set(signature, 0);
  return buffer;
}

describe("detectMimeFromBuffer", () => {
  it("reconhece JPEG pelos magic bytes", () => {
    expect(detectMimeFromBuffer(bytes(0xff, 0xd8, 0xff, 0x00))).toBe("image/jpeg");
  });

  it("reconhece PNG pelos magic bytes", () => {
    expect(detectMimeFromBuffer(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe("image/png");
  });

  it("reconhece WebP (RIFF....WEBP)", () => {
    const buffer = new Uint8Array(16);
    buffer.set([0x52, 0x49, 0x46, 0x46], 0);
    buffer.set([0x57, 0x45, 0x42, 0x50], 8);
    expect(detectMimeFromBuffer(buffer)).toBe("image/webp");
  });

  it("reconhece MP4 (ftyp no offset 4)", () => {
    const buffer = new Uint8Array(12);
    buffer.set([0x66, 0x74, 0x79, 0x70], 4);
    expect(detectMimeFromBuffer(buffer)).toBe("video/mp4");
  });

  it("reconhece WebM (EBML header)", () => {
    expect(detectMimeFromBuffer(bytes(0x1a, 0x45, 0xdf, 0xa3))).toBe("video/webm");
  });

  it("retorna null para conteúdo não reconhecido (ex.: executável)", () => {
    // MZ header (executável Windows) não é um formato de mídia permitido.
    expect(detectMimeFromBuffer(bytes(0x4d, 0x5a, 0x90, 0x00))).toBeNull();
  });
});

describe("validateMediaUpload", () => {
  it("aceita imagem JPEG dentro do limite", () => {
    const buffer = padded([0xff, 0xd8, 0xff], 1024);
    const result = validateMediaUpload(buffer, "image/jpeg");
    expect(result).toEqual({ ok: true, mimeType: "image/jpeg", kind: "image", extension: "jpg" });
  });

  it("rejeita quando o Content-Type declarado não bate com o conteúdo real", () => {
    const buffer = padded([0xff, 0xd8, 0xff], 1024);
    const result = validateMediaUpload(buffer, "image/png");
    expect(result.ok).toBe(false);
  });

  it("rejeita executável disfarçado de imagem (MIME falso)", () => {
    const buffer = padded([0x4d, 0x5a, 0x90, 0x00], 1024);
    const result = validateMediaUpload(buffer, "image/jpeg");
    expect(result.ok).toBe(false);
  });

  it("rejeita imagem acima de 5 MB", () => {
    const buffer = padded([0xff, 0xd8, 0xff], 5 * 1024 * 1024 + 1);
    const result = validateMediaUpload(buffer, "image/jpeg");
    expect(result).toEqual({ ok: false, reason: "Imagem excede o limite de 5 MB." });
  });

  it("aceita vídeo MP4 dentro do limite", () => {
    const buffer = new Uint8Array(1024);
    buffer.set([0x66, 0x74, 0x79, 0x70], 4);
    const result = validateMediaUpload(buffer, "video/mp4");
    expect(result).toEqual({ ok: true, mimeType: "video/mp4", kind: "video", extension: "mp4" });
  });

  it("rejeita vídeo acima de 50 MB", () => {
    const buffer = new Uint8Array(50 * 1024 * 1024 + 1);
    buffer.set([0x66, 0x74, 0x79, 0x70], 4);
    const result = validateMediaUpload(buffer, "video/mp4");
    expect(result).toEqual({ ok: false, reason: "Vídeo excede o limite de 50 MB." });
  });

  it("rejeita arquivo vazio", () => {
    const result = validateMediaUpload(new Uint8Array(0), "image/jpeg");
    expect(result.ok).toBe(false);
  });
});
