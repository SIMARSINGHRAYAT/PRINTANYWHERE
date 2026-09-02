import { promises as fs } from "node:fs";

export type CompletionSignal = "spooler-accepted" | "spooler-completed";

export type SubmitPrintJobInput = {
  windowsPrinterName: string;
  filePath: string;
};

export interface PrintingAdapter {
  submit(input: SubmitPrintJobInput): Promise<{ completionSignal: CompletionSignal; externalJobId: string }>;
}

class SimulatedWindowsSpoolerAdapter implements PrintingAdapter {
  async submit(input: SubmitPrintJobInput) {
    if (input.windowsPrinterName.toLowerCase().includes("offline")) {
      throw new Error("Printer offline");
    }

    await fs.access(input.filePath);

    await new Promise((resolve) => setTimeout(resolve, 800));

    return {
      completionSignal: "spooler-completed" as const,
      externalJobId: `spool_${Date.now()}`,
    };
  }
}

export const printingAdapter: PrintingAdapter = new SimulatedWindowsSpoolerAdapter();
