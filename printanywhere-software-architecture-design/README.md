# PrintAnywhere

Print anything. Anywhere. Without installing an app.

## What this implementation includes

- **Customer web print flow** (`/p/:printerId?token=...`) with no login.
- **Shopkeeper dashboard** (`/dashboard`) for:
  - discovering available printers,
  - adding printers,
  - generating secure QR pairings,
  - printing test pages,
  - observing recent print jobs.
- **Secure pairing tokens**:
  - cryptographically random token generation,
  - SHA-256 token hashing before storage,
  - active/expired checks,
  - pairing rotation (old tokens deactivated).
- **Strict upload handling**:
  - max size limits,
  - extension-independent signature detection,
  - PDF parse validation,
  - unsupported/suspicious payload rejection.
- **Privacy-preserving print lifecycle**:
  - temporary random resource IDs,
  - no customer document contents in DB,
  - immediate deletion after success/failure,
  - startup orphan cleanup,
  - periodic TTL safety cleanup.
- **Queueing and concurrency**:
  - per-printer in-memory queue to serialize printer submission,
  - print job status progression.
- **Duplicate protection**:
  - client idempotency key + DB uniqueness per printer.

## Data minimization

The schema stores only operational metadata:

- printer configuration,
- pairing metadata (hashed tokens),
- print job metadata (status, file kind/size, temp resource ID).

It does **not** store document blobs or customer identity profiles.

## Windows desktop integration architecture

This project provides the local web and gateway service foundation. For Microsoft Store compatible Windows deployment, host this Next.js service behind a WinUI 3 + Windows App SDK desktop shell/service component that:

1. Enumerates real Windows spooler printers,
2. Supplies printer availability to dashboard APIs,
3. Uses a production `IPrintingAdapter` implementation over Windows printing APIs,
4. Binds LAN endpoint according to shop policy,
5. Manages local firewall policy and startup behavior.

The existing `PrintingAdapter` interface is designed so the simulated adapter can be replaced by a Windows spooler-backed implementation without changing the API contract.

## Security notes

- Never expose this service publicly by default.
- Keep it on trusted local networks.
- Rotate pairings regularly.
- Do not log QR token values.

## Invariant

> PrintAnywhere must never intentionally retain customer documents after print completion or failure.
