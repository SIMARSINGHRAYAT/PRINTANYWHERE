"use client";

import { useEffect, useMemo, useState } from "react";

type DiscoveredPrinter = {
  windowsPrinterName: string;
  connectionType: "USB" | "Network";
  status: "Ready" | "Offline";
};

type ConfiguredPrinter = {
  id: string;
  displayName: string;
  windowsPrinterName: string;
  connectionType: string;
  status: string;
  hasPairing: boolean;
};

type PrintJob = {
  id: string;
  printerId: string;
  status: string;
  fileKind: string;
  createdAt: string;
  tempDeletedAt: string | null;
};

const CONSENT_KEY = "pa_printer_connection_allowed";

export function AdminDashboard() {
  const [available, setAvailable] = useState<DiscoveredPrinter[]>([]);
  const [configured, setConfigured] = useState<ConfiguredPrinter[]>([]);
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<string>("");
  const [pairingUrl, setPairingUrl] = useState<string>("");
  const [pairingQr, setPairingQr] = useState<string>("");
  const [activePrinterName, setActivePrinterName] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [permissionStateLoaded, setPermissionStateLoaded] = useState(false);
  const [permissionDialogOpen, setPermissionDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function loadData() {
    setIsLoading(true);
    try {
      const [availableRes, configuredRes, jobsRes] = await Promise.allSettled([
        fetch("/api/admin/printers/available", { cache: "no-store" }),
        fetch("/api/admin/printers", { cache: "no-store" }),
        fetch("/api/admin/jobs", { cache: "no-store" }),
      ]);

      if (availableRes.status === "fulfilled" && availableRes.value.ok) {
        const availableData = (await availableRes.value.json()) as { printers: DiscoveredPrinter[] };
        setAvailable(availableData.printers ?? []);
      }

      if (configuredRes.status !== "fulfilled" || !configuredRes.value.ok || jobsRes.status !== "fulfilled" || !jobsRes.value.ok) {
        throw new Error("Printer discovery is ready, but the database is unavailable. Check DATABASE_URL and migrations.");
      }

      const configuredData = (await configuredRes.value.json()) as { printers: ConfiguredPrinter[] };
      const jobsData = (await jobsRes.value.json()) as { jobs: PrintJob[] };
      setConfigured(configuredData.printers ?? []);
      setJobs(jobsData.jobs ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load printer data.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = localStorage.getItem(CONSENT_KEY);
      setPermissionGranted(saved === "true");
      setPermissionStateLoaded(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!permissionGranted) return;

    const initialLoad = window.setTimeout(() => void loadData(), 0);
    const refreshTimer = window.setInterval(() => void loadData(), 3000);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(refreshTimer);
    };
  }, [permissionGranted]);

  const canAdd = useMemo(() => Boolean(selectedPrinter) && permissionGranted, [selectedPrinter, permissionGranted]);

  function allowPrinterConnection() {
    localStorage.setItem(CONSENT_KEY, "true");
    setPermissionGranted(true);
    setPermissionDialogOpen(false);
    setMessage("Printer connection approved. You can now manage printers.");
  }

  function revokePrinterConnection() {
    localStorage.setItem(CONSENT_KEY, "false");
    setPermissionGranted(false);
    setSelectedPrinter("");
    setAvailable([]);
    setConfigured([]);
    setJobs([]);
    setPairingUrl("");
    setPairingQr("");
    setActivePrinterName("");
    setMessage("Printer connection permission removed.");
  }

  async function addPrinter() {
    if (!selectedPrinter || !permissionGranted) return;

    setMessage("Adding printer...");

    try {
      const res = await fetch("/api/admin/printers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ windowsPrinterName: selectedPrinter }),
      });

      const data = (await res.json()) as { error?: string; alreadyExists?: boolean };

      if (!res.ok) {
        setMessage(data.error ?? "Unable to add printer.");
        return;
      }

      setMessage(data.alreadyExists ? "Printer already configured." : "Printer added successfully.");
      setSelectedPrinter("");
      await loadData();
    } catch {
      setMessage("Network error while adding printer.");
    }
  }

  async function generateQr(printerId: string, displayName: string) {
    if (!permissionGranted) return;

    setMessage("Generating secure QR code...");

    try {
      const res = await fetch(`/api/admin/printers/${printerId}/pairing`, {
        method: "POST",
      });

      const data = (await res.json()) as { error?: string; pairing?: { url: string; qrDataUrl: string } };

      if (!res.ok || !data.pairing) {
        setMessage(data.error ?? "Unable to generate QR code.");
        return;
      }

      setActivePrinterName(displayName);
      setPairingUrl(data.pairing.url);
      setPairingQr(data.pairing.qrDataUrl);
      setMessage("QR code generated.");
      await loadData();
    } catch {
      setMessage("Network error while generating QR code.");
    }
  }

  async function printTestPage(printerId: string) {
    if (!permissionGranted) return;

    setMessage("Submitting test page...");

    const res = await fetch(`/api/admin/printers/${printerId}/test-page`, { method: "POST" });
    const data = (await res.json()) as { error?: string; jobId?: string };

    if (!res.ok) {
      setMessage(data.error ?? "Unable to print test page.");
      return;
    }

    setMessage(`Test page queued (${data.jobId}).`);
    await loadData();
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-black px-4 pb-10 pt-10 text-white sm:px-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-80px] top-24 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute right-[-50px] top-60 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute bottom-[-80px] left-1/4 h-80 w-80 rounded-full bg-fuchsia-500/20 blur-3xl" />
      </div>

      <div className="relative mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[2fr_1fr]">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-300">Secure local print management for your connected Windows printers.</p>

          <div className="mt-6 rounded-xl border border-white/10 bg-black/30 p-4">
            <h2 className="text-lg font-medium">Printer Connection Permission</h2>
            <p className="mt-1 text-sm text-slate-300">
              Allow this dashboard to connect to your local printer gateway and manage printer operations.
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setPermissionDialogOpen(true)}
                className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-emerald-400"
              >
                Allow Printer Connection
              </button>
              <button
                type="button"
                onClick={revokePrinterConnection}
                className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Revoke
              </button>
            </div>

            {permissionStateLoaded ? (
              <p className="mt-3 text-xs text-slate-300">
                Status: {permissionGranted ? "✅ Allowed" : "⛔ Not allowed. Grant access to continue."}
              </p>
            ) : null}
          </div>

          <div className="mt-6 rounded-xl border border-white/10 bg-black/30 p-4">
            <h2 className="text-lg font-medium">Add Printer</h2>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <select
                className="w-full rounded-lg border border-white/20 bg-black/50 p-2 text-sm text-white"
                value={selectedPrinter}
                onChange={(event) => setSelectedPrinter(event.target.value)}
                disabled={!permissionGranted}
              >
                <option value="">Select available printer</option>
                {available.map((printer) => (
                  <option key={printer.windowsPrinterName} value={printer.windowsPrinterName}>
                    {printer.windowsPrinterName} · {printer.connectionType} · {printer.status}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={addPrinter}
                disabled={!canAdd}
                className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:bg-slate-500"
              >
                {isLoading ? "Loading..." : "+ Add Printer"}
              </button>
            </div>
            {permissionGranted && !isLoading && available.length === 0 ? (
              <p className="mt-3 text-sm text-amber-300">
                No printers found. Set PRINTANYWHERE_AVAILABLE_PRINTERS or connect the Windows gateway.
              </p>
            ) : null}
          </div>

          <div className="mt-6">
            <h2 className="text-lg font-medium">Connected Printers</h2>
            <div className="mt-3 space-y-3">
              {configured.map((printer) => (
                <article key={printer.id} className="rounded-xl border border-white/10 bg-black/30 p-4">
                  <h3 className="text-base font-semibold text-white">{printer.displayName}</h3>
                  <p className="mt-1 text-sm text-slate-300">
                    <span className={printer.status.toLowerCase() === "offline" ? "text-red-400" : "text-emerald-400"}>●</span>{" "}
                    {printer.status} · {printer.connectionType}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white transition hover:bg-white/10 disabled:opacity-60"
                      onClick={() => generateQr(printer.id, printer.displayName)}
                      disabled={!permissionGranted}
                    >
                      Generate QR Code
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white transition hover:bg-white/10 disabled:opacity-60"
                      onClick={() => printTestPage(printer.id)}
                      disabled={!permissionGranted}
                    >
                      Print Test Page
                    </button>
                  </div>
                </article>
              ))}

              {configured.length === 0 ? <p className="text-sm text-slate-400">No configured printers yet.</p> : null}
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
            <h2 className="text-lg font-medium">QR Code</h2>
            {pairingQr ? (
              <div className="mt-3 space-y-3">
                <p className="text-sm text-slate-200">Printer: {activePrinterName}</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={pairingQr} alt="Pairing QR Code" className="h-56 w-56 rounded border border-white/20 bg-white p-2" />
                <p className="break-all text-xs text-slate-400">{pairingUrl}</p>
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-400">Generate a pairing to display its QR code.</p>
            )}
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
            <h2 className="text-lg font-medium">Recent Print Jobs</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {jobs.slice(0, 8).map((job) => (
                <li key={job.id} className="rounded border border-white/10 bg-black/35 p-2">
                  <p className="font-medium text-white">{job.id.slice(0, 14)}...</p>
                  <p className="text-slate-300">
                    {job.fileKind} · {job.status} · temp removed: {job.tempDeletedAt ? "yes" : "no"}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          {message ? <p className="rounded-lg bg-white/10 px-3 py-2 text-sm text-white">{message}</p> : null}
        </aside>
      </div>

      {permissionDialogOpen ? (
        <div className="fixed inset-0 z-10 grid place-items-center bg-black/70 p-4" role="presentation">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="permission-dialog-title"
            className="w-full max-w-md rounded-xl border border-white/15 bg-slate-950 p-6 shadow-2xl"
          >
            <h2 id="permission-dialog-title" className="text-xl font-semibold">Allow printer connection?</h2>
            <p className="mt-3 text-sm text-slate-300">
              PrintAnywhere will use the configured printer service to discover printers, create QR codes, and submit print jobs.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPermissionDialogOpen(false)}
                className="rounded-lg border border-white/20 px-4 py-2 text-sm text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={allowPrinterConnection}
                className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-black"
              >
                Allow
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
