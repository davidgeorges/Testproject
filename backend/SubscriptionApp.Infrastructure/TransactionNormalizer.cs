using System.Globalization;
using SubscriptionApp.Application;
using SubscriptionApp.Domain;

namespace SubscriptionApp.Infrastructure;

public sealed class TransactionNormalizer : ITransactionNormalizer
{
    private static readonly HashSet<string> Categories = ["streaming", "software", "mobile", "internet", "insurance", "energy", "sport", "press", "cloud", "other"];
    private static readonly (string Keyword, string Category)[] Rules =
    [
        ("NETFLIX", "streaming"), ("SPOTIFY", "streaming"), ("ADOBE", "software"),
        ("MOBILE", "mobile"), ("TELECOM", "mobile"), ("FIBRE", "internet"),
        ("INTERNET", "internet"), ("ASSURANCE", "insurance"), ("ENERG", "energy"),
        ("SPORT", "sport"), ("JOURNAL", "press"), ("ICLOUD", "cloud"), ("CLOUD", "cloud"),
    ];

    public IReadOnlyList<BankTransaction> Normalize(IReadOnlyList<BankTransaction> transactions)
    {
        foreach (var transaction in transactions)
        {
            var normalized = RecurringPaymentEngine.NormalizeMerchant(transaction.MerchantName);
            transaction.MerchantName = CultureInfo.GetCultureInfo("fr-FR").TextInfo.ToTitleCase(normalized.ToLowerInvariant());
            var supplied = transaction.Category.Trim().ToLowerInvariant();
            transaction.Category = Categories.Contains(supplied) && supplied != "other"
                ? supplied
                : Rules.FirstOrDefault(rule => normalized.Contains(rule.Keyword, StringComparison.Ordinal)).Category ?? "other";
            transaction.Currency = transaction.Currency.Trim().ToUpperInvariant();
        }
        return transactions;
    }
}
