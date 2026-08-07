import { NextResponse } from "next/server";

/**
 * Liveness (docs/13 §7): só confirma que o processo responde, sem consultar
 * nenhum serviço externo. Nunca revela versão interna, chave ou schema.
 */
export async function GET(): Promise<Response> {
  return NextResponse.json({ status: "ok" }, { status: 200 });
}
