import "server-only";
import { NextResponse } from "next/server";
import { AppError } from "@/lib/errors/app-error";
import { requestTableBill } from "@/modules/service-session/application/request-table-bill";

/** POST /api/public/bill-requests — docs/08 §2, docs/11 AC-BILL-001/002. */
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
    const status = await requestTableBill(body, requestId);
    return NextResponse.json(status, { status: 201 });
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
