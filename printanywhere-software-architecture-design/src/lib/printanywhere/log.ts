export function sanitizeJobLabel(jobId: string): string {
  return jobId.length <= 12 ? jobId : `${jobId.slice(0, 8)}...`;
}

export function secureLog(event: string, data?: Record<string, string | number | boolean | null>) {
  const payload = data ? ` ${JSON.stringify(data)}` : "";
  console.info(`[PrintAnywhere] ${event}${payload}`);
}
