export type DiscoveredPrinter = {
  windowsPrinterName: string;
  connectionType: "USB" | "Network";
  status: "Ready" | "Offline";
};

const fallbackPrinters: DiscoveredPrinter[] = [
  { windowsPrinterName: "EPSON TM-T82", connectionType: "USB", status: "Ready" },
  { windowsPrinterName: "HP LaserJet Pro", connectionType: "USB", status: "Ready" },
  { windowsPrinterName: "Canon Office", connectionType: "USB", status: "Offline" },
];

export function discoverAvailablePrinters(): DiscoveredPrinter[] {
  const fromEnv = process.env.PRINTANYWHERE_AVAILABLE_PRINTERS;
  if (!fromEnv) return fallbackPrinters;

  try {
    const parsed = JSON.parse(fromEnv) as DiscoveredPrinter[];
    const valid = parsed.filter((item) => item?.windowsPrinterName && item.connectionType && item.status);
    return valid.length > 0 ? valid : fallbackPrinters;
  } catch {
    return fallbackPrinters;
  }
}
