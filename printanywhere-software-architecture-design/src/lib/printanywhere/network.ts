import os from "node:os";

function getLocalNetworkAddress(): string | null {
  for (const interfaces of Object.values(os.networkInterfaces())) {
    for (const networkInterface of interfaces ?? []) {
      if (networkInterface.family !== "IPv4" || networkInterface.internal) continue;
      if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(networkInterface.address)) {
        return networkInterface.address;
      }
    }
  }

  return null;
}

export function resolveRequestOrigin(headers: Headers): string {
  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (configuredOrigin) return configuredOrigin;

  const proto = headers.get("x-forwarded-proto") ?? "http";
  const host = headers.get("x-forwarded-host") ?? headers.get("host") ?? "localhost:3000";
  if (host.startsWith("localhost") || host.startsWith("127.0.0.1")) {
    const localAddress = getLocalNetworkAddress();
    if (localAddress) return `${proto}://${localAddress}:3000`;
  }

  return `${proto}://${host}`;
}
