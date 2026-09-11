using System.Diagnostics;
using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;
using SubscriptionApp.Application;

namespace SubscriptionApp.Infrastructure;

public sealed partial class LocalDocumentTextExtractor(ILogger<LocalDocumentTextExtractor> logger)
    : IDocumentTextExtractor
{
    private static readonly SemaphoreSlim Gate = new(1, 1);

    public async Task<DocumentExtraction> Extract(
        string fileName,
        string contentType,
        byte[] content,
        CancellationToken ct)
    {
        await Gate.WaitAsync(ct);
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(ct);
        timeout.CancelAfter(TimeSpan.FromSeconds(45));
        var folder = Path.Combine(Path.GetTempPath(), "subscriptionapp-ocr", Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(folder);
        try
        {
            var extension = Path.GetExtension(fileName).ToLowerInvariant();
            var input = Path.Combine(folder, "input" + extension);
            await File.WriteAllBytesAsync(input, content, timeout.Token);
            var text = contentType == "application/pdf" || extension == ".pdf"
                ? await ExtractPdf(input, folder, timeout.Token)
                : await Run("tesseract", [input, "stdout", "-l", "fra+eng", "--psm", "6"], timeout.Token);
            return Analyse(text, Path.GetFileNameWithoutExtension(fileName));
        }
        catch (OperationCanceledException) when (!ct.IsCancellationRequested)
        {
            return new("", "other", CleanTitle(Path.GetFileNameWithoutExtension(fileName)), null, null,
                null, null, null, "failed", "OCR_TIMEOUT");
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            logger.LogWarning(exception, "Document OCR failed for {Extension}", Path.GetExtension(fileName));
            return new("", "other", CleanTitle(Path.GetFileNameWithoutExtension(fileName)), null, null,
                null, null, null, "failed", "OCR_UNAVAILABLE");
        }
        finally
        {
            try { Directory.Delete(folder, true); } catch { }
            Gate.Release();
        }
    }

    private static async Task<string> ExtractPdf(string input, string folder, CancellationToken ct)
    {
        var text = await Run("pdftotext", ["-layout", input, "-"], ct);
        if (text.Count(char.IsLetterOrDigit) >= 40) return text;
        var prefix = Path.Combine(folder, "page");
        await Run("pdftoppm", ["-jpeg", "-r", "200", "-f", "1", "-l", "10", input, prefix], ct);
        var builder = new StringBuilder();
        foreach (var image in Directory.GetFiles(folder, "page-*.jpg").OrderBy(x => x, StringComparer.Ordinal))
            builder.AppendLine(await Run("tesseract", [image, "stdout", "-l", "fra+eng", "--psm", "6"], ct));
        return builder.ToString();
    }

    private static async Task<string> Run(string executable, IReadOnlyList<string> arguments, CancellationToken ct)
    {
        var start = new ProcessStartInfo(executable) { RedirectStandardOutput = true, RedirectStandardError = true };
        foreach (var argument in arguments) start.ArgumentList.Add(argument);
        using var process = Process.Start(start) ?? throw new InvalidOperationException("OCR_PROCESS_START_FAILED");
        var output = process.StandardOutput.ReadToEndAsync(ct);
        var error = process.StandardError.ReadToEndAsync(ct);
        try
        {
            await process.WaitForExitAsync(ct);
        }
        catch (OperationCanceledException)
        {
            try { process.Kill(true); } catch { }
            throw;
        }
        if (process.ExitCode != 0) throw new InvalidOperationException((await error).Trim());
        return await output;
    }

    private static DocumentExtraction Analyse(string raw, string fallbackTitle)
    {
        var text = Regex.Replace(raw ?? "", "[\\t ]+", " ").Trim();
        if (text.Length == 0)
            return new("", "other", CleanTitle(fallbackTitle), null, null, null, null, null,
                "failed", "NO_TEXT_DETECTED");
        if (text.Length > 200_000) text = text[..200_000];
        var lower = text.ToLowerInvariant();
        var category = Classify(lower);
        var lines = text.Split(['\r', '\n'], StringSplitOptions.RemoveEmptyEntries)
            .Select(x => x.Trim()).Where(x => x.Length is >= 3 and <= 100).ToArray();
        var issuer = lines.FirstOrDefault(line => !DatePattern().IsMatch(line) && line.Any(char.IsLetter));
        var title = category switch
        {
            "insurance" => "Assurance",
            "invoice" => "Facture",
            "tax" => "Document fiscal",
            "work" => "Document professionnel",
            "housing" => "Document logement",
            "vehicle" => "Document véhicule",
            "bank" => "Document bancaire",
            _ => CleanTitle(fallbackTitle),
        };
        var amount = ParseAmount(AmountPattern().Match(text).Groups[1].Value);
        var contract = ContractPattern().Match(text).Groups[1].Value.Trim();
        var dates = DatePattern().Matches(text).Select(match => ParseDate(match.Value)).Where(d => d.HasValue)
            .Select(d => d!.Value).Distinct().Order().ToArray();
        var dueMatch = DueDatePattern().Match(text);
        DateOnly? documentDate = dates.Length > 0 ? dates[0] : null;
        DateOnly? dueDate = dueMatch.Success
            ? ParseDate(dueMatch.Groups[1].Value)
            : dates.Length > 0 ? dates[^1] : null;
        return new(text, category, title, issuer, amount, documentDate, dueDate,
            string.IsNullOrWhiteSpace(contract) ? null : contract, "ready", null);
    }

    private static string Classify(string text)
    {
        if (Contains(text, "assurance", "police", "sinistre", "mutuelle")) return "insurance";
        if (Contains(text, "facture", "montant à payer", "total ttc")) return "invoice";
        if (Contains(text, "impôt", "fiscal", "avis d'imposition", "direction générale des finances")) return "tax";
        if (Contains(text, "bulletin de paie", "salaire", "employeur")) return "work";
        if (Contains(text, "bail", "loyer", "locataire", "propriétaire")) return "housing";
        if (Contains(text, "véhicule", "immatriculation", "automobile")) return "vehicle";
        if (Contains(text, "relevé de compte", "iban", "opération bancaire")) return "bank";
        return "other";
    }

    private static bool Contains(string value, params string[] terms) => terms.Any(value.Contains);
    private static string CleanTitle(string value) => string.IsNullOrWhiteSpace(value) ? "Document" : value.Replace('_', ' ').Trim()[..Math.Min(value.Replace('_', ' ').Trim().Length, 160)];
    private static decimal? ParseAmount(string value) => decimal.TryParse(value.Replace(" ", "").Replace(',', '.'), NumberStyles.Number, CultureInfo.InvariantCulture, out var amount) ? amount : null;
    private static DateOnly? ParseDate(string value)
    {
        string[] formats = ["dd/MM/yyyy", "dd-MM-yyyy", "dd.MM.yyyy"];
        return DateOnly.TryParseExact(value.Trim(), formats, CultureInfo.InvariantCulture, DateTimeStyles.None, out var date) ? date : null;
    }

    [GeneratedRegex(@"\b(\d{1,2}[./-]\d{1,2}[./-]\d{4})\b")]
    private static partial Regex DatePattern();
    [GeneratedRegex(@"(?i)(?:échéance|date limite|à payer avant)[^\d]{0,30}(\d{1,2}[./-]\d{1,2}[./-]\d{4})")]
    private static partial Regex DueDatePattern();
    [GeneratedRegex(@"(?i)(?:total(?:\s+ttc)?|montant|prime)[^\d]{0,20}(\d{1,8}(?:[ ,.\u00a0]\d{3})*(?:[,.]\d{2})?)\s*€")]
    private static partial Regex AmountPattern();
    [GeneratedRegex(@"(?i)(?:contrat|police|référence|client)\s*(?:n[°o]?|:)\s*([A-Z0-9][A-Z0-9 ./_-]{2,40})")]
    private static partial Regex ContractPattern();
}
