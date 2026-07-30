import "server-only";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const accessDecisionSchema = z.object({
  allowed: z.boolean(),
  reason: z.string().nullable(),
});

export type EstablishmentAccessDecision = z.infer<typeof accessDecisionSchema>;

/**
 * Avalia o gate de assinatura via RPC evaluate_establishment_access.
 * Em caso de erro/resposta inesperada, falha fechado (bloqueia) — nunca
 * assume acesso liberado quando o estado não pôde ser confirmado.
 */
export async function evaluateEstablishmentAccess(establishmentId: string): Promise<EstablishmentAccessDecision> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("evaluate_establishment_access", {
    p_establishment_id: establishmentId,
  });

  if (error) {
    return { allowed: false, reason: "evaluation_error" };
  }

  const parsed = accessDecisionSchema.safeParse(data);
  if (!parsed.success) {
    return { allowed: false, reason: "evaluation_error" };
  }

  return parsed.data;
}
