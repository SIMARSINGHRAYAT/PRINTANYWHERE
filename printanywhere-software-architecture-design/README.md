# PrintAnywhere

Print anything. Anywhere. Without installing an app.

## Deploy to Vercel

Set the Vercel project root to this directory, then add `DATABASE_URL` as a production environment variable using a hosted PostgreSQL provider with SSL enabled. Deploy with the default Next.js settings.

Before the first deploy, apply the schema from `migrations/0000_initial.sql` to the database. For later schema changes, run `npm run db:generate` locally and apply them with `npm run db:migrate` using the same `DATABASE_URL`.

`PRINTANYWHERE_AVAILABLE_PRINTERS` is optional JSON used by the simulated discovery adapter. The current adapter simulates the Windows spooler; real Windows printer access requires the Windows desktop gateway described below and should not be expected from a Vercel function.

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
