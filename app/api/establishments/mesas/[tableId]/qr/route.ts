import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { requireTenantRole } from "@/lib/auth/tenant";
import { resolveActiveEstablishment } from "@/modules/tenancy/application/resolve-active-establishment";
import { getTable } from "@/modules/tables/application/tables";
import { buildTableUrl, generateTableQrPng, generateTableQrSvg } from "@/modules/tables/domain/qr";
import { slugify } from "@/modules/catalog/domain/slug";
import { getServerEnv } from "@/lib/env";

// O token da mesa pode ser regenerado a qualquer momento (RF-EST-011); sem
// isso, o Data Cache do Next.js pode memoizar a leitura de `dining_tables`
// entre requisições e servir o token antigo mesmo depois de regenerado
// (encontrado escrevendo o teste E2E de rotação de QR, Fase 9).
export const dynamic = "force-dynamic";

/** Download do QR da mesa em PNG (padrão) ou SVG (?format=svg). E-06/RF-EST-011. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tableId: string }> },
): Promise<Response> {
  const resolution = await resolveActiveEstablishment();
  if (resolution.status !== "active") {
    return NextResponse.json({ code: "FORBIDDEN", message: "Sem estabelecimento ativo." }, { status: 403 });
  }

  await requireTenantRole(resolution.establishment.establishmentId, ["owner", "manager"]);

  const { tableId } = await params;
  const table = await getTable(tableId);

  if (!table || table.establishment_id !== resolution.establishment.establishmentId) {
    return NextResponse.json({ code: "NOT_FOUND", message: "Mesa não encontrada." }, { status: 404 });
  }

  const env = getServerEnv();
  const url = buildTableUrl(env.NEXT_PUBLIC_APP_URL, resolution.establishment.slug, table.public_token);
  const safeName = slugify(table.name) || "mesa";
  const format = request.nextUrl.searchParams.get("format") === "svg" ? "svg" : "png";

  // O QR embute o token atual da mesa, que pode ser regenerado a qualquer
  // momento (RF-EST-011) — nunca deixar cache de navegador/CDN servir uma
  // versão desatualizada depois de uma regeneração (encontrado escrevendo o
  // teste E2E de rotação de QR, Fase 9).
  const noCacheHeaders = { "Cache-Control": "no-store, must-revalidate" };

  if (format === "svg") {
    const svg = await generateTableQrSvg(url);
    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Content-Disposition": `attachment; filename="qr-${safeName}.svg"`,
        ...noCacheHeaders,
      },
    });
  }

  const png = await generateTableQrPng(url);
  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="qr-${safeName}.png"`,
      ...noCacheHeaders,
    },
  });
}
