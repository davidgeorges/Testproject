using System.Globalization;
using SubscriptionApp.Application;
using SubscriptionApp.Domain;

namespace SubscriptionApp.Infrastructure;

public sealed class TransactionNormalizer : ITransactionNormalizer
{
    private static readonly HashSet<string> Categories = ["streaming", "software", "mobile", "internet", "insurance", "energy", "sport", "press", "cloud", "other"];
    private static readonly (string Keyword, string Category)[] Rules =
    [
        ("NETFLIX", "streaming"), ("SPOTIFY", "streaming"), ("DISNEY", "streaming"),
        ("DEEZER", "streaming"), ("CANAL PLUS", "streaming"), ("CANAL+", "streaming"),
        ("AMAZON PRIME", "streaming"), ("APPLE MUSIC", "streaming"),
        ("ADOBE", "software"), ("MICROSOFT 365", "software"), ("OFFICE 365", "software"),
        ("ORANGE", "mobile"), ("SFR", "mobile"), ("BOUYGUES TELECOM", "mobile"),
        ("FREE MOBILE", "mobile"), ("MOBILE", "mobile"), ("TELECOM", "mobile"),
        ("FIBRE", "internet"), ("INTERNET", "internet"),
        ("AXA", "insurance"), ("ALLIANZ", "insurance"), ("MAIF", "insurance"),
        ("MACIF", "insurance"), ("MATMUT", "insurance"), ("ASSURANCE", "insurance"),
        ("EDF", "energy"), ("ENGIE", "energy"), ("TOTALENERGIES", "energy"), ("ENERG", "energy"),
        ("BASIC FIT", "sport"), ("FITNESS PARK", "sport"), ("SPORT", "sport"),
        ("LE MONDE", "press"), ("MEDIAPART", "press"), ("JOURNAL", "press"),
        ("ICLOUD", "cloud"), ("GOOGLE ONE", "cloud"), ("DROPBOX", "cloud"), ("CLOUD", "cloud"),
    ];
    private static readonly (string Keyword, string Category)[] ProviderCategoryRules =
    [
        ("STREAM", "streaming"), ("ENTERTAINMENT", "streaming"), ("MEDIA", "streaming"),
        ("SOFTWARE", "software"), ("TELECOM", "mobile"), ("MOBILE", "mobile"),
        ("BROADBAND", "internet"), ("INTERNET", "internet"),
        ("INSURANCE", "insurance"), ("ENERGY", "energy"), ("ELECTRIC", "energy"),
        ("SPORT", "sport"), ("FITNESS", "sport"), ("NEWSPAPER", "press"),
        ("MAGAZINE", "press"), ("PRESS", "press"), ("CLOUD", "cloud"),
    ];

    public IReadOnlyList<BankTransaction> Normalize(IReadOnlyList<BankTransaction> transactions)
    {
        foreach (var transaction in transactions)
        {
            var normalized = RecurringPaymentEngine.NormalizeMerchant(transaction.MerchantName);
            transaction.MerchantName = CultureInfo.GetCultureInfo("fr-FR").TextInfo.ToTitleCase(normalized.ToLowerInvariant());
            var supplied = transaction.Category.Trim().ToLowerInvariant();
            transaction.Category = NormalizeCategory(supplied, normalized);
            transaction.Currency = transaction.Currency.Trim().ToUpperInvariant();
            transaction.IsInternalTransfer = IsExplicitInternalTransfer(supplied, normalized);
        }

        MarkMatchingTransfers(transactions);
        return transactions;
    }

    private static bool IsExplicitInternalTransfer(string supplied, string merchant)
    {
        var category = supplied.Replace('-', '_').Replace(':', '_').ToUpperInvariant();
        return category.Contains("INTERNAL_TRANSFER", StringComparison.Ordinal)
            || category.Contains("ACCOUNT_TRANSFER", StringComparison.Ordinal)
            || merchant.Contains("VIREMENT INTERNE", StringComparison.Ordinal)
            || merchant.Contains("TRANSFERT INTERNE", StringComparison.Ordinal)
            || merchant.Contains("TRANSFERT ENTRE COMPTE", StringComparison.Ordinal)
            || merchant.Contains("VIR COMPTE A COMPTE", StringComparison.Ordinal)
            || merchant.Contains("INTERNAL TRANSFER", StringComparison.Ordinal);
    }

    private static void MarkMatchingTransfers(IReadOnlyList<BankTransaction> transactions)
    {
        for (var index = 0; index < transactions.Count; index++)
        {
            var left = transactions[index];
            if (left.Amount == 0) continue;
            for (var candidateIndex = index + 1; candidateIndex < transactions.Count; candidateIndex++)
            {
                var right = transactions[candidateIndex];
                if (left.AccountKey == right.AccountKey
                    || !left.Currency.Equals(right.Currency, StringComparison.OrdinalIgnoreCase)
                    || left.Amount != -right.Amount
                    || Math.Abs(left.BookedAt.DayNumber - right.BookedAt.DayNumber) > 3)
                    continue;

                left.IsInternalTransfer = true;
                right.IsInternalTransfer = true;
                break;
            }
        }
    }

    private static string NormalizeCategory(string supplied, string merchant)
    {
        if (Categories.Contains(supplied) && supplied != "other") return supplied;
        var merchantMatch = Rules.FirstOrDefault(rule => merchant.Contains(rule.Keyword, StringComparison.Ordinal)).Category;
        if (merchantMatch is not null) return merchantMatch;
        var providerCategory = supplied.Replace('-', '_').ToUpperInvariant();
        return ProviderCategoryRules.FirstOrDefault(rule => providerCategory.Contains(rule.Keyword, StringComparison.Ordinal)).Category ?? "other";
    }
}
