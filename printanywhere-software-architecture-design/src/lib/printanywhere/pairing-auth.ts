import { and, eq, gt, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { printerPairings } from "@/db/schema";
import { hashToken } from "@/lib/printanywhere/security";

export async function verifyPairingToken(printerId: string, token: string) {
  const tokenHash = hashToken(token);

  const record = await db.query.printerPairings.findFirst({
    where: and(
      eq(printerPairings.printerId, printerId),
      eq(printerPairings.tokenHash, tokenHash),
      eq(printerPairings.isActive, true),
      or(isNull(printerPairings.expiresAt), gt(printerPairings.expiresAt, new Date())),
    ),
  });

  return record ?? null;
}
