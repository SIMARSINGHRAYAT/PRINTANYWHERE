import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { printJobs, printerPairings, printers } from "@/db/schema";
import { PrintJobStatuses } from "@/lib/printanywhere/jobs";
import { processPrintJob } from "@/lib/printanywhere/processor";
import { enqueuePrinterTask } from "@/lib/printanywhere/queue";
import { newId } from "@/lib/printanywhere/security";
import { createTempResource, initializeCleanupSubsystem } from "@/lib/printanywhere/temp-files";

export const runtime = "nodejs";

export async function POST(_: Request, { params }: { params: Promise<{ printerId: string }> }) {
  await initializeCleanupSubsystem();

  const { printerId } = await params;
  const printer = await db.query.printers.findFirst({
    where: and(eq(printers.id, printerId), eq(printers.isActive, true)),
  });

  if (!printer) {
    return Response.json({ error: "Printer not found" }, { status: 404 });
  }

  const pairing = await db.query.printerPairings.findFirst({ where: eq(printerPairings.printerId, printer.id) });

  if (!pairing) {
    return Response.json({ error: "Generate a pairing first" }, { status: 400 });
  }

  const content = Buffer.from(
    `================================\n\n          PRINTANYWHERE\n\n        Scan to Print\n\nPrinter: ${printer.displayName}\nStatus: ${printer.status.toUpperCase()}\n\nScan this QR code with your phone\nto print a document.\n\n================================\n`,
    "utf8",
  );

  const temp = await createTempResource(content, "txt");
  const jobId = newId("job");

  await db.insert(printJobs).values({
    id: jobId,
    printerId: printer.id,
    pairingId: pairing.id,
    idempotencyKey: newId("test_page"),
    status: PrintJobStatuses.Queued,
    fileKind: "test-page",
    fileSizeBytes: content.byteLength,
    tempResourceId: temp.resourceId,
    tempExtension: temp.extension,
  });

  enqueuePrinterTask(printer.id, async () => {
    await processPrintJob(jobId);
  });

  return Response.json({ ok: true, jobId });
}
