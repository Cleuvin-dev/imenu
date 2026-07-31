import "server-only";
import { NextResponse } from "next/server";
import { getTableBillStatus } from "@/modules/service-session/application/get-table-bill-status";

/** GET /api/public/bill-requests/{tableToken} — polling da página "/conta" (docs/04 P-06). */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tableToken: string }> },
): Promise<Response> {
  const { tableToken } = await params;
  const status = await getTableBillStatus(tableToken);

  if (!status.valid) {
    return NextResponse.json({ code: "NOT_FOUND", message: "Mesa não encontrada." }, { status: 404 });
  }

  return NextResponse.json(status);
}
