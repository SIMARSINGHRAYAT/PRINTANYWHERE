const printerQueues = new Map<string, Promise<void>>();

export function enqueuePrinterTask(printerId: string, task: () => Promise<void>): Promise<void> {
  const prev = printerQueues.get(printerId) ?? Promise.resolve();

  const next = prev
    .catch(() => undefined)
    .then(task)
    .catch(() => undefined);

  printerQueues.set(printerId, next);
  return next;
}
