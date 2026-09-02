import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type DiscoveredPrinter = {
  windowsPrinterName: string;
  connectionType: "USB" | "Network";
  status: "Ready" | "Offline";
};

function discoverFromEnvironment(): DiscoveredPrinter[] {
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

export async function discoverAvailablePrinters(): Promise<DiscoveredPrinter[]> {
  if (process.platform !== "win32") return discoverFromEnvironment();

  try {
    const { stdout } = await execFileAsync(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-Command", "Get-Printer | Select-Object Name,PortName,PrinterStatus | ConvertTo-Json -Compress"],
      { timeout: 5000, windowsHide: true, maxBuffer: 1024 * 1024 },
    );
    const parsed = JSON.parse(stdout) as
      | { Name?: string; PortName?: string; PrinterStatus?: number }
      | Array<{ Name?: string; PortName?: string; PrinterStatus?: number }>;
    const printers = Array.isArray(parsed) ? parsed : [parsed];

    return printers
      .filter((printer) => Boolean(printer.Name))
      .map((printer) => ({
        windowsPrinterName: printer.Name as string,
        connectionType: String(printer.PortName ?? "").toUpperCase().startsWith("USB") ? "USB" as const : "Network" as const,
        status: printer.PrinterStatus === 0 || printer.PrinterStatus === 1 ? "Ready" as const : "Offline" as const,
      }));
  } catch {
    return [];
  }
}
