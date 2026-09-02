import { desc } from "drizzle-orm";
import { db } from "@/db";
import { printJobs } from "@/db/schema";

export const runtime = "nodejs";

export async function GET() {
  const jobs = await db.query.printJobs.findMany({
    orderBy: [desc(printJobs.createdAt)],
    limit: 30,
  });

  return Response.json({ jobs });
}
