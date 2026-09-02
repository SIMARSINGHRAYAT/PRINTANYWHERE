import { headers } from "next/headers";
import QRCode from "qrcode";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { printerPairings, printers } from "@/db/schema";
import { resolveRequestOrigin } from "@/lib/printanywhere/network";
import { addDays, nowUtc } from "@/lib/printanywhere/time";
import { PAIRING_TOKEN_TTL_DAYS } from "@/lib/printanywhere/constants";
import { generateStrongToken, hashToken, newId } from "@/lib/printanywhere/security";

export const runtime = "nodejs";

export async function POST(_: Request, { params }: { params: Promise<{ printerId: string }> }) {
  const { printerId } = await params;

  const printer = await db.query.printers.findFirst({
    where: and(eq(printers.id, printerId), eq(printers.isActive, true)),
  });

  if (!printer) {
    return Response.json({ error: "Printer not found" }, { status: 404 });
  }

  const now = nowUtc();

  await db
    .update(printerPairings)
    .set({
      isActive: false,
    })
    .where(eq(printerPairings.printerId, printer.id));

  const token = generateStrongToken();
  const tokenHash = hashToken(token);

  const pairingId = newId("pair");

  await db.insert(printerPairings).values({
    id: pairingId,
    printerId: printer.id,
    tokenHash,
    isActive: true,
    expiresAt: addDays(now, PAIRING_TOKEN_TTL_DAYS),
  });

  const hdrs = await headers();
  const origin = resolveRequestOrigin(hdrs);
  const pairingUrl = `${origin}/p/${printer.id}?token=${encodeURIComponent(token)}`;

  const qrDataUrl = await QRCode.toDataURL(pairingUrl, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 280,
  });

  const latest = await db.query.printerPairings.findFirst({
    where: eq(printerPairings.id, pairingId),
    orderBy: [desc(printerPairings.createdAt)],
  });

  return Response.json({
    printer: { id: printer.id, displayName: printer.displayName },
    pairing: {
      id: latest?.id,
      expiresAt: latest?.expiresAt,
      url: pairingUrl,
      qrDataUrl,
    },
  });
}
