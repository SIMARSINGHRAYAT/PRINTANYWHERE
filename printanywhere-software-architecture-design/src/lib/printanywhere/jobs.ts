export const PrintJobStatuses = {
  Received: "Received",
  Validating: "Validating",
  Queued: "Queued",
  Printing: "Printing",
  Completed: "Completed",
  Failed: "Failed",
  Cancelled: "Cancelled",
  Expired: "Expired",
} as const;

export type PrintJobStatus = (typeof PrintJobStatuses)[keyof typeof PrintJobStatuses];

export const TERMINAL_STATUSES = new Set<PrintJobStatus>([
  PrintJobStatuses.Completed,
  PrintJobStatuses.Failed,
  PrintJobStatuses.Cancelled,
  PrintJobStatuses.Expired,
]);
