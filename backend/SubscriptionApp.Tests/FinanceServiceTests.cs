using SubscriptionApp.Application;
using SubscriptionApp.Domain;
using SubscriptionApp.Infrastructure;
using Xunit;

namespace SubscriptionApp.Tests;

public sealed class FinanceServiceTests
{
    [Fact]
    public async Task OverviewUsesPersistentBudgetsRulesAndExcludesInternalTransfers()
    {
        const string userId = "finance-user";
        var store = new InMemoryWorkspaceStore();
        await store.Profile(userId, default);
        var connection = new BankConnection { UserId = userId, BankName = "Banque", Status = "connected" };
        await store.AddConnection(connection, default);
        var rent = new BankTransaction { UserId = userId, ConnectionId = connection.Id, ExternalId = "rent", AccountKey = "main", BookedAt = new(2026, 9, 2), Amount = -900, MerchantName = "Bailleur", Category = "other", Currency = "EUR" };
        var groceries = new BankTransaction { UserId = userId, ConnectionId = connection.Id, ExternalId = "food", AccountKey = "main", BookedAt = new(2026, 9, 3), Amount = -120, MerchantName = "Carrefour", Category = "shopping", Currency = "EUR" };
        var transfer = new BankTransaction { UserId = userId, ConnectionId = connection.Id, ExternalId = "move", AccountKey = "main", BookedAt = new(2026, 9, 4), Amount = -300, MerchantName = "Virement interne", Category = "other", Currency = "EUR", IsInternalTransfer = true };
        await store.Synchronize(connection, [rent, groceries, transfer], default);
        await store.SaveTransactionCategoryRule(new() { UserId = userId, TransactionId = rent.Id, Category = "logement" }, default);
        await store.SaveCategoryBudget(new() { UserId = userId, Category = "logement", DisplayName = "Maison", MonthlyLimit = 850, CategoryType = "fixed" }, default);
        await store.SaveCategoryBudget(new() { UserId = userId, Category = "courses", MonthlyLimit = 300, CategoryType = "variable" }, default);

        var service = new FinanceService(store, new FixedTimeProvider(new DateTimeOffset(2026, 9, 10, 12, 0, 0, TimeSpan.Zero)));
        var overview = await service.Overview(userId, new(new(2026, 9, 1), new(2026, 9, 30)), default);

        Assert.Equal(1020, overview.Expense);
        Assert.Equal(900, overview.FixedExpense);
        Assert.Equal(120, overview.VariableExpense);
        Assert.Equal(1150, overview.MonthlyBudget);
        Assert.Contains(overview.Categories, category => category.Category == "logement" && category.Label == "Maison" && category.Status == "exceeded");
        Assert.DoesNotContain(overview.Categories, category => category.Category == "transfert");
    }

    private sealed class FixedTimeProvider(DateTimeOffset now) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => now;
    }
}
