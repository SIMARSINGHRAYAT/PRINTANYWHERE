export type DiscoveredPrinter = {
  windowsPrinterName: string;
  connectionType: "USB" | "Network";
  status: "Ready" | "Offline";
};

export function discoverAvailablePrinters(): DiscoveredPrinter[] {
  const fromEnv = process.env.PRINTANYWHERE_AVAILABLE_PRINTERS;
  if (!fromEnv) return [];

  try {
    const parsed = JSON.parse(fromEnv) as DiscoveredPrinter[];
    return parsed.filter(
      (item) =>
        item?.windowsPrinterName &&
        (item.connectionType === "USB" || item.connectionType === "Network") &&
        (item.status === "Ready" || item.status === "Offline"),
    );
  } catch {
    return [];
  }
}
