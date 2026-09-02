import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { printJobs, printers } from "@/db/schema";
import { validateUploadedFile } from "@/lib/printanywhere/file-validation";
import { PrintJobStatuses } from "@/lib/printanywhere/jobs";
import { secureLog } from "@/lib/printanywhere/log";
import { verifyPairingToken } from "@/lib/printanywhere/pairing-auth";
import { processPrintJob } from "@/lib/printanywhere/processor";
import { enqueuePrinterTask } from "@/lib/printanywhere/queue";
import { checkTokenRateLimit } from "@/lib/printanywhere/rate-limit";
import { newId } from "@/lib/printanywhere/security";
import {
  createTempResource,
  deleteTempResource,
  initializeCleanupSubsystem,
  verifyTempResourceDeleted,
} from "@/lib/printanywhere/temp-files";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  await initializeCleanupSubsystem();

  const form = await request.formData().catch(() => null);
  if (!form) {
    return Response.json({ error: "Malformed request" }, { status: 400 });
  }

  const printerId = String(form.get("printerId") ?? "").trim();
  const token = String(form.get("token") ?? "").trim();
  const idempotencyKey = String(form.get("idempotencyKey") ?? "").trim();
  const inputFile = form.get("file");

  if (!printerId || !token || !idempotencyKey || !(inputFile instanceof File)) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  const printer = await db.query.printers.findFirst({
    where: and(eq(printers.id, printerId), eq(printers.isActive, true)),
  });

  if (!printer) {
    return Response.json({ error: "Printer unavailable" }, { status: 404 });
  }

  const pairing = await verifyPairingToken(printerId, token);
  if (!pairing) {
    return Response.json({ error: "Unauthorized pairing token" }, { status: 401 });
  }

  if (!checkTokenRateLimit(pairing.tokenHash)) {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }

  const existing = await db.query.printJobs.findFirst({
    where: and(eq(printJobs.printerId, printerId), eq(printJobs.idempotencyKey, idempotencyKey)),
  });

  if (existing) {
    return Response.json({
      ok: true,
      duplicate: true,
      jobId: existing.id,
      status: existing.status,
    });
  }

  const fileBuffer = Buffer.from(await inputFile.arrayBuffer());

  let tempResource: Awaited<ReturnType<typeof createTempResource>> | null = null;

  try {
    const validated = await validateUploadedFile({
      buffer: fileBuffer,
      declaredMime: inputFile.type,
    });

    tempResource = await createTempResource(fileBuffer, validated.extension);
    const jobId = newId("job");

    await db.insert(printJobs).values({
      id: jobId,
      printerId: printer.id,
      pairingId: pairing.id,
      idempotencyKey,
      status: PrintJobStatuses.Queued,
      fileKind: validated.kind,
      fileSizeBytes: validated.size,
      tempResourceId: tempResource.resourceId,
      tempExtension: tempResource.extension,
      updatedAt: new Date(),
    });

    const processing = enqueuePrinterTask(printer.id, async () => {
      await processPrintJob(jobId);
    });
    await processing;

    secureLog("Job accepted", { jobId, printer: printer.id });

    return Response.json({
      ok: true,
      duplicate: false,
      jobId,
      status: PrintJobStatuses.Queued,
    });
  } catch (error) {
    if (tempResource) {
      await deleteTempResource(tempResource.filePath);
      await verifyTempResourceDeleted(tempResource.filePath);
    }

    const message = error instanceof Error ? error.message : "Unable to process file";
    return Response.json({ error: message }, { status: 400 });
  }
}
