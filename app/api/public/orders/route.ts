import "server-only";
import { NextResponse } from "next/server";
import { AppError } from "@/lib/errors/app-error";
import { createPublicOrder } from "@/modules/ordering/application/create-public-order";

/** POST /api/public/orders — docs/08 §2, docs/05 §2, docs/11 AC-ORD-001 a 006. */
export async function POST(request: Request): Promise<Response> {
  const requestId = crypto.randomUUID();

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
      return NextResponse.json(error.toPublicShape(), { status: error.status });
    }
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Ocorreu um erro inesperado. Tente novamente.", requestId, status: 500 },
      { status: 500 },
    );
  }
}
