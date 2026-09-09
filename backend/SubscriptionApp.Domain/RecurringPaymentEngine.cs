using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;

namespace SubscriptionApp.Domain;

public sealed record DetectionOptions(
    int MinimumOccurrences = 3,
    decimal MaximumAmountVariation = 0.25m,
    int MonthlyToleranceDays = 4,
    int QuarterlyToleranceDays = 8,
    int AnnualToleranceDays = 15,
    int WeeklyToleranceDays = 2,
    string MinimumConfidence = "MEDIUM"
);

public sealed partial class RecurringPaymentEngine(DetectionOptions options)
{
    private static readonly HashSet<string> ServiceCategories =
    [
        "streaming",
        "software",
        "mobile",
        "internet",
        "insurance",
        "energy",
        "sport",
        "press",
        "cloud",
    ];

    public static string NormalizeMerchant(string name) =>
        Whitespace().Replace(Prefix().Replace(name.Trim().ToUpperInvariant(), ""), " ").Trim();

    public IReadOnlyList<Payment> Detect(IEnumerable<BankTransaction> transactions, DateOnly today)
    {
        if (options.MinimumOccurrences < 2)
            throw new ArgumentOutOfRangeException(nameof(options));
        var minimumConfidence = options.MinimumConfidence.ToUpperInvariant();
        if (minimumConfidence is not ("MEDIUM" or "HIGH"))
            throw new ArgumentOutOfRangeException(nameof(options));
        var results = new List<Payment>();
        // Never merge different users, currencies or accounts. Credits are not recurring expenses.
        foreach (
            var group in transactions
                .Where(t => t.Amount < 0 && t.Currency == "EUR" && t.BookedAt <= today)
                .DistinctBy(t => (t.UserId, t.Provider, t.ExternalId))
                .GroupBy(t =>
                    (
                        t.UserId,
                        t.AccountKey,
                        Merchant: NormalizeMerchant(t.MerchantName),
                        t.Currency
                    )
                )
        )
        {
            var rows = group.OrderBy(t => t.BookedAt).ToArray();
            if (
                rows.Length < options.MinimumOccurrences
                || string.IsNullOrWhiteSpace(group.Key.Merchant)
            )
                continue;
            var intervals = rows.Zip(
                    rows.Skip(1),
                    (a, b) => b.BookedAt.DayNumber - a.BookedAt.DayNumber
                )
                .ToArray();
            var meanDays = intervals.Average();
            var cadence = meanDays switch
            {
                >= 6 and <= 8 => "weekly",
                >= 12 and <= 16 => "biweekly",
                >= 26 and <= 35 => "monthly",
                >= 82 and <= 100 => "quarterly",
                >= 350 and <= 380 => "annual",
                _ => "",
            };
            if (cadence == "")
                continue;
            var months = cadence == "monthly" ? 1 : cadence == "quarterly" ? 3 : cadence == "annual" ? 12 : 0;
            var days = cadence == "weekly" ? 7 : cadence == "biweekly" ? 14 : 0;
            var tolerance = cadence switch
            {
                "weekly" or "biweekly" => options.WeeklyToleranceDays,
                "monthly" => options.MonthlyToleranceDays,
                "quarterly" => options.QuarterlyToleranceDays,
                _ => options.AnnualToleranceDays,
            };
            var deviations = rows.Zip(
                    rows.Skip(1),
                    (a, b) =>
                        Math.Abs(b.BookedAt.DayNumber - (days > 0 ? a.BookedAt.AddDays(days) : a.BookedAt.AddMonths(months)).DayNumber)
                )
                .ToArray();
            var nextPayment = days > 0 ? rows[^1].BookedAt.AddDays(days) : rows[^1].BookedAt.AddMonths(months);
            if (
                deviations.Any(d => d > tolerance)
                || today.DayNumber > nextPayment.DayNumber + tolerance
            )
                continue;
            var average = rows.Average(t => Math.Abs(t.Amount));
            if (
                average <= 0
                || rows.Max(t => Math.Abs(Math.Abs(t.Amount) - average)) / average
                    > options.MaximumAmountVariation
            )
                continue;
            var category = rows[^1].Category;
            if (!ServiceCategories.Contains(category))
                continue;
            var confidence = rows.Length >= 4 && deviations.All(d => d <= 2) ? "HIGH" : "MEDIUM";
            if (minimumConfidence == "HIGH" && confidence != "HIGH") continue;
            var key =
                $"{group.Key.UserId}|{group.Key.AccountKey}|{group.Key.Merchant}|{group.Key.Currency}";
            var id = Convert
                .ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(key)))[..24]
                .ToLowerInvariant();
            results.Add(
                new Payment(
                    id,
                    rows[^1].MerchantName,
                    category,
                    cadence,
                    decimal.Round(average, 2),
                    decimal.Round(cadence == "weekly" ? average * 52 / 12 : cadence == "biweekly" ? average * 26 / 12 : average / months, 2),
                    confidence,
                    rows[0].BookedAt,
                    rows[^1].BookedAt,
                    nextPayment,
                    rows.Select(t => new PaymentHistory(t.BookedAt, -t.Amount)).ToArray()
                )
            );
        }
        return results.OrderByDescending(p => p.MonthlyCost).ToArray();
    }

    [GeneratedRegex(@"\s+")]
    private static partial Regex Whitespace();

    [GeneratedRegex(@"^(PRLV SEPA|PRELEVEMENT|PRLV|SEPA|CB)\s+")]
    private static partial Regex Prefix();
}
