"use client";

import { FormEvent, useMemo, useState } from "react";

type Props = {
  printerId: string;
  printerName: string;
  token: string;
};

type Phase = "idle" | "uploading" | "preparing" | "printing" | "completed" | "failed";

const terminalStatuses = new Set(["Completed", "Failed", "Cancelled", "Expired"]);

export function CustomerPrintForm({ printerId, printerName, token }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string>("");
  const [jobStatus, setJobStatus] = useState<string>("Ready");
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const phaseLabel = useMemo(() => {
    if (phase === "uploading") return "Uploading...";
    if (phase === "preparing") return "Preparing print...";
    if (phase === "printing") return "Printing...";
    if (phase === "completed") return "Print completed successfully.";
    if (phase === "failed") return "Print failed.";
    return "";
  }, [phase]);

  async function pollJob(jobId: string) {
    let done = false;

    while (!done) {
      const res = await fetch(`/api/print/jobs/${jobId}?token=${encodeURIComponent(token)}`, {
        cache: "no-store",
      });

      if (!res.ok) {
        setError("Unable to retrieve print status.");
        setPhase("failed");
        return;
      }

      const data = (await res.json()) as {
        status: string;
        failureReason?: string;
        tempDeleted?: boolean;
      };

      setJobStatus(data.status);

      if (data.status === "Printing" || data.status === "Queued") {
        setPhase("printing");
      }

      if (terminalStatuses.has(data.status)) {
        done = true;

        if (data.status === "Completed") {
          setPhase("completed");
          setError("");
        } else {
          setPhase("failed");
          setError(data.failureReason ?? "Print request failed.");
        }
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 1200));
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file || isSubmitting) return;

    setError("");
    setIsSubmitting(true);
    setPhase("uploading");

    try {
      const form = new FormData();
      form.append("printerId", printerId);
      form.append("token", token);
      form.append("idempotencyKey", crypto.randomUUID());
      form.append("file", file);

      const res = await fetch("/api/print", {
        method: "POST",
        body: form,
      });

      const data = (await res.json()) as { error?: string; jobId?: string };

      if (!res.ok || !data.jobId) {
        setPhase("failed");
        setError(data.error ?? "Unable to submit print request.");
        setIsSubmitting(false);
        return;
      }

      setPhase("preparing");
      setJobStatus("Queued");

      await pollJob(data.jobId);
    } catch {
      setPhase("failed");
      setError("Network error while submitting print request.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
      <h1 className="text-2xl font-semibold text-slate-900">PrintAnywhere</h1>

      <div className="mt-4 space-y-2 text-sm text-slate-700">
        <p>
          <span className="font-medium">Printer:</span> {printerName}
        </p>
        <p>
          <span className="font-medium">Status:</span> <span className="text-emerald-600">● Ready</span>
        </p>
      </div>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <label className="block text-sm font-medium text-slate-800">Select your file</label>
        <input
          type="file"
          accept="application/pdf,image/png,image/jpeg"
          required
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          className="block w-full rounded-lg border border-slate-300 p-2 text-sm"
          disabled={isSubmitting}
        />

        <p className="text-xs text-slate-500">Supported: PDF, PNG, JPG, JPEG</p>

        <button
          type="submit"
          disabled={!file || isSubmitting}
          className="w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isSubmitting ? "Processing..." : "PRINT"}
        </button>
      </form>

      {phaseLabel ? <p className="mt-5 text-sm text-slate-800">{phaseLabel}</p> : null}
      {jobStatus ? <p className="mt-1 text-xs text-slate-500">Job status: {jobStatus}</p> : null}

      {phase === "completed" ? (
        <p className="mt-4 text-sm text-emerald-700">
          Your file has been removed from the PrintAnywhere system.
        </p>
      ) : null}

      {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
