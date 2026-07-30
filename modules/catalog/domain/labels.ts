import type { Database } from "@/lib/supabase/database-types";

export const PRODUCT_STATUS_LABELS: Record<Database["public"]["Enums"]["product_status"], string> = {
  draft: "Rascunho",
  published: "Publicado",
  archived: "Arquivado",
};
