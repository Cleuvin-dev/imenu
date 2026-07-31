"use client";

import { useEffect, useState } from "react";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type RealtimeConnectionStatus = "connecting" | "connected" | "disconnected";

/**
 * Assina mudanças (`postgres_changes`) numa tabela filtrada por
 * `establishment_id` e invalida a query correspondente a cada evento — o
 * cliente nunca confia no conteúdo do evento em si, só o usa para saber que
 * precisa reconsultar (docs/08 §7). Também invalida ao (re)conectar, para
 * não depender só de eventos perdidos durante uma queda (docs/05 §7).
 *
 * Único hook client-side dentro de `modules/` neste projeto: o restante do
 * módulo é server-only por convenção, mas assinatura Realtime só existe no
 * navegador.
 */
export function useRealtimeInvalidate(params: {
  table: "orders" | "products" | "bill_requests" | "table_service_sessions";
  establishmentId: string;
  queryKey: QueryKey;
}): RealtimeConnectionStatus {
  const { table, establishmentId, queryKey } = params;
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<RealtimeConnectionStatus>("connecting");

  useEffect(() => {
    // Reinicia o indicador de conexão a cada (re)assinatura (troca de tenant/tabela).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStatus("connecting");
    const supabase = createSupabaseBrowserClient();
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      // `createBrowserClient` resolve a sessão (via cookies) de forma
      // assíncrona e só então propaga o JWT para o cliente Realtime
      // (`realtime.setAuth`). Sem aguardar aqui, o `phx_join` costuma sair
      // antes disso e a assinatura entra como `anon` — passa no INSERT
      // (que não depende de RLS sobre o registro antigo) mas silenciosamente
      // não recebe UPDATE nenhum, porque `is_active_member()` nunca vê o
      // usuário autenticado. Aguardar a sessão elimina a corrida.
      await supabase.auth.getSession();
      if (cancelled) return;

      channel = supabase
        .channel(`tenant:${establishmentId}:${table}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table, filter: `establishment_id=eq.${establishmentId}` },
          () => {
            queryClient.invalidateQueries({ queryKey });
          },
        )
        .subscribe((channelStatus) => {
          if (channelStatus === "SUBSCRIBED") {
            setStatus("connected");
            queryClient.invalidateQueries({ queryKey });
          } else if (channelStatus === "CLOSED" || channelStatus === "CHANNEL_ERROR" || channelStatus === "TIMED_OUT") {
            setStatus("disconnected");
          }
        });
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- queryKey já é memoizado por establishmentId no chamador
  }, [establishmentId, table, queryClient]);

  return status;
}
