# PrintAnywhere Windows Gateway

This gateway runs on the Windows computer connected to the printer. It uses Windows spooler APIs to list printers and `PrintTo` to submit documents. It is intentionally bound to `127.0.0.1` until a secure transport is added.

## Run locally

Set a token in the process environment, then run the project:

```powershell
$env:PRINTANYWHERE_GATEWAY_TOKEN = "use-a-long-random-token"
dotnet run --project .\PrintAnywhere.Gateway.csproj
```

The gateway listens on `http://127.0.0.1:17321`. It exposes `/health`, authenticated `GET /printers`, and authenticated `POST /print`.

## Build MSIX

Install the Windows SDK so `makeappx.exe` is available, then run:

```powershell
.\build-msix.ps1
```

The package must be signed with a trusted certificate before installation. A production deployment also needs a secure outbound connection or polling protocol between this gateway and the Vercel service. Never expose the gateway port directly to the public internet.

This project currently provides the working local spooler gateway and MSIX packaging boundary. Connecting Vercel jobs to the gateway still requires an authenticated relay or outbound polling service; Vercel cannot make inbound requests to a private Windows machine.