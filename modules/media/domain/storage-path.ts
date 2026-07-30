/** Caminho de mídia de produto: {establishment_id}/products/{product_id}/{uuid}.{ext} (docs/07 §13). */
export function buildProductMediaPath(establishmentId: string, productId: string, extension: string): string {
  return `${establishmentId}/products/${productId}/${crypto.randomUUID()}.${extension}`;
}
