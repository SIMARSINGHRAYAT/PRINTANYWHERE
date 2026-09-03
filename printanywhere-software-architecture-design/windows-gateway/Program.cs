using System.Diagnostics;
using System.IO;
using System.Printing;
using System.Security.Cryptography;
using System.Text;

var builder = WebApplication.CreateBuilder(args);
builder.WebHost.UseUrls("http://127.0.0.1:17321");
var app = builder.Build();
var gatewayToken = Environment.GetEnvironmentVariable("PRINTANYWHERE_GATEWAY_TOKEN")
    ?? throw new InvalidOperationException("PRINTANYWHERE_GATEWAY_TOKEN is required");

bool Authorized(HttpRequest request)
{
    var supplied = request.Headers["X-PrintAnywhere-Token"].ToString();
    return !string.IsNullOrWhiteSpace(supplied) && CryptographicOperations.FixedTimeEquals(
        Encoding.UTF8.GetBytes(supplied), Encoding.UTF8.GetBytes(gatewayToken));
}

app.MapGet("/health", () => Results.Ok(new { ok = true }));

app.MapGet("/printers", (HttpRequest request) =>
{
    if (!Authorized(request)) return Results.Unauthorized();

    using var server = new LocalPrintServer();
    var printers = server.GetPrintQueues()
        .Select(queue => new
        {
            windowsPrinterName = queue.FullName,
            connectionType = queue.QueuePort.Name.StartsWith("USB", StringComparison.OrdinalIgnoreCase) ? "USB" : "Network",
            status = queue.QueueStatus.HasFlag(PrintQueueStatus.Offline) ? "Offline" : "Ready",
        });
    return Results.Ok(new { printers });
});

app.MapPost("/print", async (HttpRequest request) =>
{
    if (!Authorized(request)) return Results.Unauthorized();

    var printerName = request.Headers["X-Printer-Name"].ToString();
    if (string.IsNullOrWhiteSpace(printerName)) return Results.BadRequest(new { error = "X-Printer-Name is required" });

    var temporaryFile = Path.Combine(Path.GetTempPath(), $"printanywhere-{Guid.NewGuid():N}{Path.GetExtension(request.Headers["X-File-Name"].ToString())}");
    try
    {
        await using (var output = File.Create(temporaryFile))
            await request.Body.CopyToAsync(output);

        var escapedPath = temporaryFile.Replace("'", "''");
        var escapedPrinter = printerName.Replace("'", "''");
        var command = $"Start-Process -FilePath '{escapedPath}' -Verb PrintTo -ArgumentList '\"{escapedPrinter}\"' -Wait";
        using var process = new Process
        {
            StartInfo = new ProcessStartInfo("powershell.exe", $"-NoProfile -NonInteractive -Command \"{command}\"")
            {
                CreateNoWindow = true,
                UseShellExecute = false,
            },
        };
        if (!process.Start()) return Results.Problem("Could not start Windows print process");
        await process.WaitForExitAsync();
        return process.ExitCode == 0 ? Results.Ok(new { completed = true }) : Results.Problem("Windows print process failed");
    }
    finally
    {
        try { File.Delete(temporaryFile); } catch { }
    }
});

app.Run();
