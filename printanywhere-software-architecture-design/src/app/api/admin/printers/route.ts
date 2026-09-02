import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { printerPairings, printers } from "@/db/schema";
import { discoverAvailablePrinters } from "@/lib/printanywhere/printer-discovery";
import { newId } from "@/lib/printanywhere/security";

export const runtime = "nodejs";

export async function GET() {
  const records = await db.query.printers.findMany({ orderBy: [desc(printers.createdAt)] });

  const withPairing = await Promise.all(
    records.map(async (printer) => {
      const pairing = await db.query.printerPairings.findFirst({
        where: eq(printerPairings.printerId, printer.id),
        orderBy: [desc(printerPairings.createdAt)],
      });

      return {
        ...printer,
        hasPairing: Boolean(pairing?.isActive),
      };
    }),
  );

  return Response.json({ printers: withPairing });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { windowsPrinterName?: string } | null;

  if (!body?.windowsPrinterName) {
    return Response.json({ error: "windowsPrinterName is required" }, { status: 400 });
  }

  const available = discoverAvailablePrinters().find(
    (printer) => printer.windowsPrinterName === body.windowsPrinterName,
  );

  if (!available) {
    return Response.json({ error: "Printer not available" }, { status: 404 });
  }

  const existing = await db.query.printers.findFirst({
    where: eq(printers.windowsPrinterName, body.windowsPrinterName),
  });

  if (existing) {
    return Response.json({ printer: existing, alreadyExists: true });
  }

  const id = newId("prn");

  await db.insert(printers).values({
    id,
    displayName: body.windowsPrinterName,
    windowsPrinterName: body.windowsPrinterName,
    connectionType: available.connectionType,
    status: available.status,
    isActive: true,
  });

  const created = await db.query.printers.findFirst({ where: eq(printers.id, id) });

  return Response.json({ printer: created, alreadyExists: false }, { status: 201 });
}
