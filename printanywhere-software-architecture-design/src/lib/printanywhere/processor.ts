import { promises as fs } from "node:fs";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { printJobs, printers } from "@/db/schema";
import { PrintJobStatuses } from "@/lib/printanywhere/jobs";
import { sanitizeJobLabel, secureLog } from "@/lib/printanywhere/log";
import { printingAdapter } from "@/lib/printanywhere/printing-adapter";
import { deleteTempResource, getTempRootPath, verifyTempResourceDeleted } from "@/lib/printanywhere/temp-files";

async function updateStatus(jobId: string, status: string, failureReason?: string | null) {
  await db
    .update(printJobs)
    .set({
      status,
      failureReason: failureReason ?? null,
      updatedAt: new Date(),
      ...(status === PrintJobStatuses.Completed || status === PrintJobStatuses.Failed
        ? { completedAt: new Date() }
        : {}),
    })
    .where(eq(printJobs.id, jobId));
}

async function findTempFilePath(resourceId: string, extension: string) {
  const fullPath = path.join(getTempRootPath(), `${resourceId}.${extension}`);
  try {
    await fs.access(fullPath);
    return fullPath;
  } catch {
    return null;
  }
}

async function cleanupAndMarkDeleted(jobId: string, filePath: string) {
  await deleteTempResource(filePath);
  const deleted = await verifyTempResourceDeleted(filePath);

  await db
    .update(printJobs)
    .set({
      tempDeletedAt: deleted ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(printJobs.id, jobId));

  return deleted;
}

export async function processPrintJob(jobId: string) {
  const job = await db.query.printJobs.findFirst({ where: eq(printJobs.id, jobId) });
  if (!job) return;

  const printer = await db.query.printers.findFirst({
    where: and(eq(printers.id, job.printerId), eq(printers.isActive, true)),
  });

  if (!printer) {
    await updateStatus(job.id, PrintJobStatuses.Failed, "Printer unavailable");
    return;
  }

  await updateStatus(job.id, PrintJobStatuses.Printing);
  secureLog("Job printing", { job: sanitizeJobLabel(job.id), printer: printer.id });

  const tempPath = await findTempFilePath(job.tempResourceId, job.tempExtension);
  if (!tempPath) {
    await updateStatus(job.id, PrintJobStatuses.Failed, "Temporary file missing");
    return;
  }

  try {
    const printed = await printingAdapter.submit({
      windowsPrinterName: printer.windowsPrinterName,
      filePath: tempPath,
    });

    await db
      .update(printJobs)
      .set({
        status: PrintJobStatuses.Completed,
        completionSignal: printed.completionSignal,
        updatedAt: new Date(),
        completedAt: new Date(),
      })
      .where(eq(printJobs.id, job.id));

    const deleted = await cleanupAndMarkDeleted(job.id, tempPath);
    secureLog("Job completed", { job: sanitizeJobLabel(job.id), deleted });
  } catch {
    await cleanupAndMarkDeleted(job.id, tempPath);
    await updateStatus(job.id, PrintJobStatuses.Failed, "Print failed");
    secureLog("Job failed", { job: sanitizeJobLabel(job.id) });
  }
}
