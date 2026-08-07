/**
 * Captura de exceções do lado servidor (docs/13 §6). Convenção nativa do
 * Next.js — carregado automaticamente, roda para qualquer erro não tratado
 * durante uma requisição (Server Components, Route Handlers, Server
 * Actions). Só loga metadados estruturados, nunca corpo de requisição
 * completo ou segredo.
 */
export async function onRequestError(
  error: unknown,
  request: { path: string; method: string; headers: Record<string, string | string[] | undefined> },
): Promise<void> {
  const { logger } = await import("@/lib/logging");

  const requestId = request.headers["x-request-id"];
  logger.error(error instanceof Error ? error.message : "Erro não tratado no servidor", {
    requestId: typeof requestId === "string" ? requestId : undefined,
    route: `${request.method} ${request.path}`,
    event: "unhandled_server_error",
    stack: error instanceof Error ? error.stack : undefined,
  });
}
