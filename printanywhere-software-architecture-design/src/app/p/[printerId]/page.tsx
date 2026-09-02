import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { printers } from "@/db/schema";
import { CustomerPrintForm } from "@/components/customer-print-form";
import { verifyPairingToken } from "@/lib/printanywhere/pairing-auth";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ printerId: string }>;
  searchParams: Promise<{ token?: string }>;
};

export default async function CustomerPrinterPage({ params, searchParams }: Props) {
  const { printerId } = await params;
  const { token } = await searchParams;

  if (!token) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-100 p-6">
        <div className="rounded-xl bg-white p-6 text-center shadow">
          <h1 className="text-xl font-semibold text-slate-900">PrintAnywhere</h1>
          <p className="mt-3 text-sm text-red-700">Missing secure pairing token.</p>
        </div>
      </main>
    );
  }

  const pairing = await verifyPairingToken(printerId, token);
  if (!pairing) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-100 p-6">
        <div className="rounded-xl bg-white p-6 text-center shadow">
          <h1 className="text-xl font-semibold text-slate-900">PrintAnywhere</h1>
          <p className="mt-3 text-sm text-red-700">This print link is invalid or expired.</p>
        </div>
      </main>
    );
  }

  const printer = await db.query.printers.findFirst({
    where: and(eq(printers.id, printerId), eq(printers.isActive, true)),
  });

  if (!printer) {
    notFound();
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 px-4 py-8">
      <CustomerPrintForm printerId={printer.id} printerName={printer.displayName} token={token} />
    </main>
  );
}
