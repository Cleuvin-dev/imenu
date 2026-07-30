import "server-only";
import { NextResponse } from "next/server";
import { getPublicOrderStatus } from "@/modules/ordering/application/get-public-order";

/** GET /api/public/orders/{trackingToken} — docs/08 §2. Fail-closed: token inválido vira 404 genérico. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ trackingToken: string }> },
): Promise<Response> {
  const { trackingToken } = await params;
  const status = await getPublicOrderStatus(trackingToken);

  if (!status.valid) {
    return NextResponse.json({ code: "NOT_FOUND", message: "Pedido não encontrado." }, { status: 404 });
  }

  return NextResponse.json(status);
}
