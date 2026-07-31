import type { Metadata } from "next";
import Link from "next/link";
import { getTableBillStatus } from "@/modules/service-session/application/get-table-bill-status";
import { InvalidQrState } from "../public-states";
import { BillRequestClient } from "./bill-request-client";

export const metadata: Metadata = {
  title: "Solicitar conta — iMenu",
};

export default async function ContaPage({
  params,
}: {
  params: Promise<{ establishmentSlug: string; tableToken: string }>;
}) {
  const { establishmentSlug, tableToken } = await params;
  const status = await getTableBillStatus(tableToken);

  if (!status.valid) {
    return <InvalidQrState />;
  }

  return (
    <main className="min-h-screen bg-neutral-50">
      <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3">
        <Link href={`/m/${establishmentSlug}/t/${tableToken}`} className="text-sm font-medium text-primary-700">
          ← Voltar ao cardápio
        </Link>
        <p className="text-sm text-neutral-600">{status.tableName}</p>
      </header>
      <BillRequestClient tableToken={tableToken} initialStatus={status} />
    </main>
  );
}
