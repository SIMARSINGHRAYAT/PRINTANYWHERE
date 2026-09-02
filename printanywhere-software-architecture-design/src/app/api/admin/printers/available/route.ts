import { discoverAvailablePrinters } from "@/lib/printanywhere/printer-discovery";

export const runtime = "nodejs";

export async function GET() {
  return Response.json({ printers: discoverAvailablePrinters() });
}
