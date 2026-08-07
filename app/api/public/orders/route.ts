import "server-only";
import { NextResponse } from "next/server";
import { AppError } from "@/lib/errors/app-error";
import { createPublicOrder } from "@/modules/ordering/application/create-public-order";
import { logger } from "@/lib/logging";

/** POST /api/public/orders — docs/08 §2, docs/05 §2, docs/11 AC-ORD-001 a 006. */
export async function POST(request: Request): Promise<Response> {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  const route = "POST /api/public/orders";

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message: "Corpo da requisição inválido.", requestId, status: 400 },
      { status: 400 },
    );
  }

  try {
    const order = await createPublicOrder(body, requestId);
    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    if (error instanceof AppError) {
      // Falhas de negócio esperadas (preço mudou, item esgotado etc.) não são
      // alerta — só INTERNAL_ERROR indica algo realmente quebrado (docs/13 §6:
      // "alerta para falha de criação de pedido").
      const level = error.code === "INTERNAL_ERROR" ? "error" : "warn";
      logger[level]("Falha ao criar pedido público", {
        requestId,
        route,
        event: "order_creation_failed",
        code: error.code,
      });
      return NextResponse.json(error.toPublicShape(), { status: error.status });
    }
    logger.error("Erro inesperado ao criar pedido público", {
      requestId,
      route,
      event: "order_creation_failed",
      code: "INTERNAL_ERROR",
    });
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Ocorreu um erro inesperado. Tente novamente.", requestId, status: 500 },
      { status: 500 },
    );
  }
}
