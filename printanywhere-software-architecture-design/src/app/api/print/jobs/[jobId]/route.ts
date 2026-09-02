import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { printJobs } from "@/db/schema";
import { verifyPairingToken } from "@/lib/printanywhere/pairing-auth";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const url = new URL(request.url);
  const token = url.searchParams.get("token")?.trim() ?? "";

  if (!token) {
    return Response.json({ error: "Token required" }, { status: 400 });
  }

  const job = await db.query.printJobs.findFirst({ where: eq(printJobs.id, jobId) });
  if (!job) {
    return Response.json({ error: "Job not found" }, { status: 404 });
  }

  const pairing = await verifyPairingToken(job.printerId, token);
  if (!pairing || pairing.id !== job.pairingId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await db
    .update(printJobs)
    .set({
      updatedAt: new Date(),
    })
    .where(and(eq(printJobs.id, job.id), eq(printJobs.printerId, job.printerId)));

  return Response.json({
    jobId: job.id,
    status: job.status,
    createdAt: job.createdAt,
    completedAt: job.completedAt,
    failureReason: job.failureReason,
    completionSignal: job.completionSignal,
    tempDeleted: Boolean(job.tempDeletedAt),
  });
}
