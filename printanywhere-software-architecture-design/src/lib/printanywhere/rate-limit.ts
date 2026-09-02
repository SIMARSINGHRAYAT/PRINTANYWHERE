import { RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW_MS } from "@/lib/printanywhere/constants";

type Bucket = {
  timestamps: number[];
};

const tokenBuckets = new Map<string, Bucket>();

export function checkTokenRateLimit(tokenHash: string): boolean {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;

  const bucket = tokenBuckets.get(tokenHash) ?? { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter((timestamp) => timestamp >= cutoff);

  if (bucket.timestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    tokenBuckets.set(tokenHash, bucket);
    return false;
  }

  bucket.timestamps.push(now);
  tokenBuckets.set(tokenHash, bucket);
  return true;
}
