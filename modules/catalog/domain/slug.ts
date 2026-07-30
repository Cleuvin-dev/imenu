/** Gera um slug estável a partir de um nome (usado para produtos). */
export function slugify(input: string): string {
  const COMBINING_DIACRITICS = /[̀-ͯ]/g;
  return input
    .normalize("NFD")
    .replace(COMBINING_DIACRITICS, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160);
}
