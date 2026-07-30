/** URL pública de um objeto em bucket público do Storage (brand-media/menu-media). */
export function buildPublicMediaUrl(supabaseUrl: string, bucket: string, path: string): string {
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
}
