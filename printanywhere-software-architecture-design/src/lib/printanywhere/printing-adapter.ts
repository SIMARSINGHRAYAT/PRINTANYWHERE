import { promises as fs } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type CompletionSignal = "spooler-accepted" | "spooler-completed";

export type SubmitPrintJobInput = {
  windowsPrinterName: string;
  filePath: string;
};

export interface PrintingAdapter {
  submit(input: SubmitPrintJobInput): Promise<{ completionSignal: CompletionSignal; externalJobId: string }>;
}

class WindowsSpoolerAdapter implements PrintingAdapter {
  async submit(input: SubmitPrintJobInput) {
    await fs.access(input.filePath);

    if (process.platform !== "win32") {
      throw new Error("Windows printer gateway is required to print");
    }

    const escapedPath = input.filePath.replace(/'/g, "''");
    const escapedPrinter = input.windowsPrinterName.replace(/'/g, "''");
    const command = input.filePath.toLowerCase().endsWith(".txt")
      ? `Get-Content -Raw -LiteralPath '${escapedPath}' | Out-Printer -Name '${escapedPrinter}'`
      : `Start-Process -FilePath '${escapedPath}' -Verb PrintTo -ArgumentList '\"${escapedPrinter}\"' -Wait`;
    await execFileAsync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", command], {
      timeout: 30000,
      windowsHide: true,
    });

    return {
      completionSignal: "spooler-completed" as const,
      externalJobId: `windows_spooler_${Date.now()}`,
    };
  }
}

export const printingAdapter: PrintingAdapter = new WindowsSpoolerAdapter();
