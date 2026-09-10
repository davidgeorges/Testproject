using System.Globalization;
using System.Text;
using SubscriptionApp.Domain;

namespace SubscriptionApp.Application;

public sealed record FinanceQuery(
    DateOnly? From = null,
    DateOnly? To = null,
    Guid? ConnectionId = null,
    Guid? AccountId = null,
    string? Category = null,
    string? Kind = null,
    string? Search = null,
    bool ExcludeInternalTransfers = true
);

public sealed record FinanceTransaction(
    Guid Id,
    Guid ConnectionId,
    Guid? AccountId,
    DateOnly BookedAt,
    decimal Amount,
    string Currency,
    string MerchantName,
    string Category,
    string CategoryLabel,
    string ProviderCategory,
    bool IsCustomCategory,
    bool IsInternalTransfer,
    string BankName,
    string AccountName
);

public sealed record FinanceCategorySummary(
    string Category,
    string Label,
    decimal Income,
    decimal Expense,
    int Count,
    string CategoryType,
    decimal? MonthlyLimit,
    decimal? PeriodLimit,
    decimal? Remaining,
    string Status
);

public sealed record FinanceCashflow(
    string Month,
    decimal Income,
    decimal Expense,
    decimal Net,
    decimal Planned,
    decimal Delta
);

public sealed record FinanceForecast(
    bool Available,
    decimal Planned,
    decimal Spent,
    decimal Projected,
    int RemainingDays,
    bool IsOverrun,
    decimal OverrunAmount
);

public sealed record FinanceOverview(
    DateOnly From,
    DateOnly To,
    decimal Income,
    decimal Expense,
    decimal Net,
    decimal FixedExpense,
    decimal VariableExpense,
    decimal MonthlyBudget,
    IReadOnlyList<FinanceCategorySummary> Categories,
    IReadOnlyList<FinanceCashflow> Cashflow,
    FinanceForecast Forecast,
    int TransactionCount,
    int InternalTransferCount
);

public static class FinanceCategories
{
    public static readonly IReadOnlyDictionary<string, string> Labels =
        new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["logement"] = "Logement",
            ["transport"] = "Transport",
            ["courses"] = "Courses",
            ["restauration"] = "Restauration",
            ["abonnements"] = "Abonnements",
            ["sante"] = "Santé",
            ["loisirs"] = "Loisirs",
            ["energie"] = "Énergie",
            ["assurance"] = "Assurances",
            ["impots"] = "Impôts",
            ["education"] = "Éducation",
            ["achats"] = "Achats",
            ["voyage"] = "Voyage",
            ["revenus"] = "Revenus",
            ["transfert"] = "Transferts",
            ["other"] = "Autres",
        };

    private static readonly HashSet<string> FixedCategories =
        ["logement", "abonnements", "energie", "assurance", "impots", "education"];

    public static string Normalize(string? category)
    {
        var value = (category ?? "").Trim().ToLowerInvariant();
        return Labels.ContainsKey(value) ? value : "other";
    }

    public static string Label(string category) => Labels.TryGetValue(category, out var label) ? label : Labels["other"];

    public static string DefaultType(string category) => FixedCategories.Contains(category) ? "fixed" : "variable";

    public static string Resolve(BankTransaction transaction)
    {
        var source = $"{transaction.Category} {transaction.MerchantName}".ToUpperInvariant();
        if (transaction.Amount > 0 && !transaction.IsInternalTransfer) return "revenus";
        if (Contains(source, "INTERNAL_TRANSFER", "ACCOUNT_TRANSFER", "VIREMENT INTERNE", "TRANSFERT ENTRE COMPTE")) return "transfert";
        if (Contains(source, "STREAM", "SOFTWARE", "MOBILE", "INTERNET", "SPORT", "PRESS", "CLOUD", "NETFLIX", "SPOTIFY", "ADOBE")) return "abonnements";
        if (Contains(source, "HOUS", "RENT", "LOYER", "IMMOBIL", "COPROPRI")) return "logement";
        if (Contains(source, "TRANSPORT", "FUEL", "ESSENCE", "CARBURANT", "SNCF", "RATP", "UBER", "PARKING", "PEAGE")) return "transport";
        if (Contains(source, "GROC", "SUPERMARKET", "COURSE", "CARREFOUR", "AUCHAN", "LECLERC", "LIDL", "INTERMARCHE")) return "courses";
        if (Contains(source, "RESTAUR", "DINING", "DELIVEROO", "UBER EATS", "MCDONALD")) return "restauration";
        if (Contains(source, "HEALTH", "SANTE", "PHARMAC", "MEDECIN", "DOCTOLIB", "HOPITAL")) return "sante";
        if (Contains(source, "ENTERTAINMENT", "LEISURE", "LOISIR", "CINEMA", "BOWLING")) return "loisirs";
        if (Contains(source, "ENERGY", "ENERGIE", "ELECTRIC", "EDF", "ENGIE", "GAZ")) return "energie";
        if (Contains(source, "INSURANCE", "ASSURANCE", "AXA", "MAIF", "MACIF", "ALLIANZ", "MATMUT")) return "assurance";
        if (Contains(source, "TAX", "IMPOT", "TRESOR PUBLIC", "DGFIP")) return "impots";
        if (Contains(source, "EDUCATION", "SCHOOL", "ECOLE", "UNIVERSIT", "FORMATION")) return "education";
        if (Contains(source, "TRAVEL", "VOYAGE", "HOTEL", "AIRBNB", "AIR FRANCE")) return "voyage";
        if (Contains(source, "SHOPPING", "PURCHASE", "ACHAT", "AMAZON", "FNAC", "DECATHLON")) return "achats";
        return "other";
    }

    private static bool Contains(string value, params string[] needles) =>
        needles.Any(needle => value.Contains(needle, StringComparison.Ordinal));
}

public sealed class FinanceService(IWorkspaceStore store, TimeProvider time)
{
    public async Task<IReadOnlyList<FinanceTransaction>> Transactions(string userId, FinanceQuery query, CancellationToken ct)
    {
        var transactions = await store.Transactions(userId, ct);
        var rules = (await store.TransactionCategoryRules(userId, ct)).ToDictionary(r => r.TransactionId);
        var connections = (await store.Connections(userId, ct)).ToDictionary(c => c.Id);
        var accounts = (await store.Accounts(userId, ct)).ToDictionary(a => a.Id);
        var term = query.Search?.Trim();

        return transactions
            .Select(transaction =>
            {
                var hasRule = rules.TryGetValue(transaction.Id, out var rule);
                var category = hasRule ? FinanceCategories.Normalize(rule!.Category) : FinanceCategories.Resolve(transaction);
                var bank = connections.TryGetValue(transaction.ConnectionId, out var connection) ? connection.BankName : "Banque";
                var account = transaction.AccountId is { } accountId && accounts.TryGetValue(accountId, out var bankAccount)
                    ? bankAccount.MaskedName
                    : "Compte";
                return new FinanceTransaction(
                    transaction.Id, transaction.ConnectionId, transaction.AccountId, transaction.BookedAt,
                    transaction.Amount, transaction.Currency, transaction.MerchantName, category,
                    FinanceCategories.Label(category), transaction.Category, hasRule,
                    transaction.IsInternalTransfer, bank, account
                );
            })
            .Where(item => query.From is null || item.BookedAt >= query.From)
            .Where(item => query.To is null || item.BookedAt <= query.To)
            .Where(item => query.ConnectionId is null || item.ConnectionId == query.ConnectionId)
            .Where(item => query.AccountId is null || item.AccountId == query.AccountId)
            .Where(item => string.IsNullOrWhiteSpace(query.Category) || item.Category.Equals(query.Category, StringComparison.OrdinalIgnoreCase))
            .Where(item => query.Kind?.ToLowerInvariant() switch
            {
                "income" => item.Amount > 0,
                "expense" => item.Amount < 0,
                _ => true,
            })
            .Where(item => !query.ExcludeInternalTransfers || !item.IsInternalTransfer)
            .Where(item => string.IsNullOrWhiteSpace(term)
                || item.MerchantName.Contains(term, StringComparison.OrdinalIgnoreCase)
                || item.CategoryLabel.Contains(term, StringComparison.OrdinalIgnoreCase)
                || item.ProviderCategory.Contains(term, StringComparison.OrdinalIgnoreCase)
                || item.BankName.Contains(term, StringComparison.OrdinalIgnoreCase)
                || item.AccountName.Contains(term, StringComparison.OrdinalIgnoreCase))
            .OrderByDescending(item => item.BookedAt)
            .ThenByDescending(item => item.Id)
            .ToArray();
    }

    public async Task<FinanceOverview> Overview(string userId, FinanceQuery query, CancellationToken ct)
    {
        var today = DateOnly.FromDateTime(time.GetUtcNow().UtcDateTime);
        var from = query.From ?? new DateOnly(today.Year, today.Month, 1);
        var to = query.To ?? new DateOnly(today.Year, today.Month, DateTime.DaysInMonth(today.Year, today.Month));
        if (to < from) (from, to) = (to, from);

        var effectiveQuery = query with { From = from, To = to };
        var filtered = await Transactions(userId, effectiveQuery, ct);
        var included = filtered.Where(t => !t.IsInternalTransfer || !query.ExcludeInternalTransfers).ToArray();
        var budgets = await store.CategoryBudgets(userId, ct);
        var budgetByCategory = budgets.ToDictionary(b => b.Category, StringComparer.OrdinalIgnoreCase);
        var monthCount = CountMonths(from, to);

        var categoryKeys = included.Select(t => t.Category)
            .Concat(budgets.Select(b => b.Category))
            .Distinct(StringComparer.OrdinalIgnoreCase);
        var categories = categoryKeys
            .Select(category =>
            {
                var group = included.Where(t => t.Category.Equals(category, StringComparison.OrdinalIgnoreCase)).ToArray();
                var income = group.Where(t => t.Amount > 0).Sum(t => t.Amount);
                var expense = group.Where(t => t.Amount < 0).Sum(t => Math.Abs(t.Amount));
                budgetByCategory.TryGetValue(category, out var budget);
                var periodLimit = budget is null ? (decimal?)null : budget.MonthlyLimit * monthCount;
                var remaining = periodLimit - expense;
                var status = periodLimit is null ? "unset" : expense > periodLimit ? "exceeded" : expense >= periodLimit * .85m ? "near" : "ok";
                return new FinanceCategorySummary(
                    category, budget?.DisplayName ?? FinanceCategories.Label(category), income, expense, group.Length,
                    budget?.CategoryType ?? FinanceCategories.DefaultType(category), budget?.MonthlyLimit,
                    periodLimit, remaining, status
                );
            })
            .OrderByDescending(category => category.Expense + category.Income)
            .ToArray();

        var monthlyBudget = budgets.Sum(b => b.MonthlyLimit);
        var cashflow = EnumerateMonths(from, to).Select(month =>
        {
            var rows = included.Where(t => t.BookedAt.Year == month.Year && t.BookedAt.Month == month.Month).ToArray();
            var income = rows.Where(t => t.Amount > 0).Sum(t => t.Amount);
            var expense = rows.Where(t => t.Amount < 0).Sum(t => Math.Abs(t.Amount));
            return new FinanceCashflow($"{month.Year:D4}-{month.Month:D2}", income, expense, income - expense, monthlyBudget, expense - monthlyBudget);
        }).Reverse().ToArray();

        var currentRows = included.Where(t => t.BookedAt.Year == today.Year && t.BookedAt.Month == today.Month && t.BookedAt <= today).ToArray();
        var spent = currentRows.Where(t => t.Amount < 0).Sum(t => Math.Abs(t.Amount));
        var daysInMonth = DateTime.DaysInMonth(today.Year, today.Month);
        var projected = today.Day > 0 ? Math.Round(spent / today.Day * daysInMonth, 2) : spent;
        var forecastAvailable = monthlyBudget > 0 && from <= today && to >= today;
        var forecast = new FinanceForecast(
            forecastAvailable, monthlyBudget, spent, forecastAvailable ? projected : 0,
            Math.Max(daysInMonth - today.Day, 0), forecastAvailable && projected > monthlyBudget,
            forecastAvailable ? Math.Max(projected - monthlyBudget, 0) : 0
        );

        var expenseTotal = included.Where(t => t.Amount < 0).Sum(t => Math.Abs(t.Amount));
        var incomeTotal = included.Where(t => t.Amount > 0).Sum(t => t.Amount);
        var fixedExpense = categories.Where(c => c.CategoryType == "fixed").Sum(c => c.Expense);
        return new FinanceOverview(
            from, to, incomeTotal, expenseTotal, incomeTotal - expenseTotal, fixedExpense,
            expenseTotal - fixedExpense, monthlyBudget, categories, cashflow, forecast,
            included.Length, filtered.Count(t => t.IsInternalTransfer)
        );
    }

    public async Task<string> ExportCsv(string userId, FinanceQuery query, CancellationToken ct)
    {
        var rows = await Transactions(userId, query, ct);
        var csv = new StringBuilder("Date;Type;Montant;Devise;Categorie;Libelle;Banque;Compte;VirementInterne;Reference\r\n");
        foreach (var row in rows)
        {
            csv.Append(Escape(row.BookedAt.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture))).Append(';')
                .Append(row.Amount >= 0 ? "Revenu" : "Dépense").Append(';')
                .Append(row.Amount.ToString(CultureInfo.InvariantCulture)).Append(';')
                .Append(Escape(row.Currency)).Append(';').Append(Escape(row.CategoryLabel)).Append(';')
                .Append(Escape(row.MerchantName)).Append(';').Append(Escape(row.BankName)).Append(';')
                .Append(Escape(row.AccountName)).Append(';').Append(row.IsInternalTransfer ? "oui" : "non").Append(';')
                .Append(row.Id).Append("\r\n");
        }
        return csv.ToString();
    }

    private static int CountMonths(DateOnly from, DateOnly to) => (to.Year - from.Year) * 12 + to.Month - from.Month + 1;

    private static IEnumerable<DateOnly> EnumerateMonths(DateOnly from, DateOnly to)
    {
        var current = new DateOnly(from.Year, from.Month, 1);
        var end = new DateOnly(to.Year, to.Month, 1);
        while (current <= end)
        {
            yield return current;
            current = current.AddMonths(1);
        }
    }

    private static string Escape(string value) => $"\"{value.Replace("\"", "\"\"")}\"";
}
