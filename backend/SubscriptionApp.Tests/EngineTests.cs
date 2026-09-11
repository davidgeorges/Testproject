using SubscriptionApp.Domain;
using SubscriptionApp.Infrastructure;
using Xunit;

namespace SubscriptionApp.Tests;

public sealed class EngineTests
{
    private static readonly DateOnly Today = new(2026, 9, 8);

    private static BankTransaction Tx(
        DateOnly date,
        decimal amount = -30m,
        string merchant = "PRLV SEPA Mobile",
        string user = "a",
        string account = "bank-1"
    ) =>
        new()
        {
            ExternalId = $"{user}-{account}-{date}-{merchant}",
            UserId = user,
            AccountKey = account,
            BookedAt = date,
            Amount = amount,
            MerchantName = merchant,
            Category = "mobile",
        };

    private static RecurringPaymentEngine Engine(DetectionOptions? options = null) =>
        new(options ?? new());

    [Fact]
    public async Task ExpiringConsentCreatesOneUserNotification()
    {
        var store = new InMemoryWorkspaceStore();
        var userId = Guid.NewGuid().ToString();
        await store.AddConnection(
            new BankConnection
            {
                UserId = userId,
                BankName = "Banque test",
                ConsentExpiresAt = DateTimeOffset.UtcNow.AddDays(2),
            },
            default
        );
        var processor = new ConsentExpiryProcessor(store, TimeProvider.System);

        await processor.RunOnce(default);
        await processor.RunOnce(default);

        var notification = Assert.Single(await store.Notifications(userId, default));
        Assert.Equal("consent_expiring", notification.Type);
    }

    [Fact]
    public async Task DueDeadlineCreatesOnlyOneReminderNotification()
    {
        var store = new InMemoryWorkspaceStore();
        var deadline = new UserDeadline
        {
            UserId = Guid.NewGuid().ToString(),
            Title = "Échéance test",
            DueAt = DateTimeOffset.UtcNow.AddMinutes(30),
            ReminderMinutesBefore = 60,
        };
        await store.AddDeadline(deadline, default);
        var processor = new DeadlineReminderProcessor(store, TimeProvider.System);

        await processor.RunOnce(default);
        await processor.RunOnce(default);

        var notification = Assert.Single(await store.Notifications(deadline.UserId, default));
        Assert.Equal("deadline_reminder", notification.Type);
        Assert.Equal(deadline.Id.ToString(), notification.ResourceId);
    }

    [Fact]
    public void CalendarMonthEndsAreRecognized()
    {
        var dates = new[]
        {
            new DateOnly(2026, 5, 31),
            new(2026, 6, 30),
            new(2026, 7, 31),
            new(2026, 8, 31),
        };
        var result = Assert.Single(Engine().Detect(dates.Select(d => Tx(d)), Today));
        Assert.Equal("monthly", result.Cadence);
        Assert.Equal(30m, result.MonthlyCost);
        Assert.Equal(new DateOnly(2026, 9, 30), result.NextPaymentAt);
    }

    [Theory]
    [InlineData(3, "quarterly", 10)]
    [InlineData(12, "annual", 2.5)]
    public void OtherCadencesNormalizeToMonthly(int months, string expected, decimal cost)
    {
        var rows = Enumerable
            .Range(0, 4)
            .Select(i => Tx(new DateOnly(2026, 9, 1).AddMonths(-i * months)));
        var payment = Assert.Single(Engine().Detect(rows, Today));
        Assert.Equal(expected, payment.Cadence);
        Assert.Equal(cost, payment.MonthlyCost);
    }

    [Theory]
    [InlineData(7, "weekly", 130)]
    [InlineData(14, "biweekly", 65)]
    public void ShortRegularCadencesNormalizeToMonthly(int days, string expected, decimal cost)
    {
        var rows = Enumerable.Range(0, 4).Select(i => Tx(Today.AddDays(-i * days)));
        var payment = Assert.Single(Engine().Detect(rows, Today));
        Assert.Equal(expected, payment.Cadence);
        Assert.Equal(cost, payment.MonthlyCost);
        Assert.Equal(Today.AddDays(days), payment.NextPaymentAt);
    }

    [Fact]
    public void TwoOccurrencesAreInsufficientByDefault()
    {
        Assert.Empty(Engine().Detect([Tx(new(2026, 8, 1)), Tx(new(2026, 9, 1))], Today));
    }

    [Fact]
    public void ThresholdIsConfigurable()
    {
        Assert.Single(
            Engine(new(MinimumOccurrences: 2))
                .Detect([Tx(new(2026, 8, 1)), Tx(new(2026, 9, 1))], Today)
        );
    }

    [Fact]
    public void ConfidenceThresholdIsConfigurable()
    {
        var medium = new[] { Tx(new(2026, 7, 1)), Tx(new(2026, 8, 1)), Tx(new(2026, 9, 1)) };
        Assert.Single(Engine().Detect(medium, Today));
        Assert.Empty(Engine(new(MinimumConfidence: "HIGH")).Detect(medium, Today));
    }

    [Fact]
    public void DoesNotMergeUsersOrAccounts()
    {
        var rows = Enumerable
            .Range(0, 3)
            .Select(i => Tx(new DateOnly(2026, 9, 1).AddMonths(-i), user: i.ToString()));
        Assert.Empty(Engine().Detect(rows, Today));
        Assert.Empty(
            Engine()
                .Detect(
                    Enumerable
                        .Range(0, 3)
                        .Select(i =>
                            Tx(new DateOnly(2026, 9, 1).AddMonths(-i), account: i.ToString())
                        ),
                    Today
                )
        );
    }

    [Fact]
    public void RefundsCurrenciesAndIrregularPurchasesAreExcluded()
    {
        var credits = Enumerable
            .Range(0, 4)
            .Select(i => Tx(new DateOnly(2026, 9, 1).AddMonths(-i), amount: 30m));
        Assert.Empty(Engine().Detect(credits, Today));
        var usd = Enumerable
            .Range(0, 4)
            .Select(i =>
            {
                var t = Tx(new DateOnly(2026, 9, 1).AddMonths(-i));
                t.Currency = "USD";
                return t;
            });
        Assert.Empty(Engine().Detect(usd, Today));
        Assert.Empty(
            Engine()
                .Detect(
                    [
                        Tx(new(2026, 6, 1)),
                        Tx(new(2026, 7, 18)),
                        Tx(new(2026, 8, 3)),
                        Tx(new(2026, 9, 1)),
                    ],
                    Today
                )
        );
    }

    [Fact]
    public void StalePaymentsAreNotCountedAsCurrent()
    {
        Assert.Empty(
            Engine()
                .Detect(
                    Enumerable.Range(0, 5).Select(i => Tx(new DateOnly(2026, 6, 1).AddMonths(-i))),
                    Today
                )
        );
    }

    [Fact]
    public void DuplicateImportsDoNotInflateDetection()
    {
        var rows = Enumerable
            .Range(0, 4)
            .Select(i => Tx(new DateOnly(2026, 9, 1).AddMonths(-i)))
            .ToArray();
        Assert.Equal(4, Assert.Single(Engine().Detect(rows.Concat(rows), Today)).History.Count);
    }

    [Fact]
    public void AmountOutliersAreRejected()
    {
        Assert.Empty(
            Engine()
                .Detect(
                    [Tx(new(2026, 7, 1)), Tx(new(2026, 8, 1)), Tx(new(2026, 9, 1), -90m)],
                    Today
                )
        );
    }

    [Fact]
    public void MerchantNormalizationDoesNotStripMeaningfulDigits()
    {
        Assert.Equal(
            "MOBILE 24",
            RecurringPaymentEngine.NormalizeMerchant(" PRLV SEPA  Mobile   24 ")
        );
    }

    private static Payment Payment() =>
        new("p", "Mobile", "mobile", "monthly", 34.99m, 34.99m, "HIGH", Today, Today, Today, []);

    [Fact]
    public void SavingsIncludeSetupFeesAndDoNotInventUsage()
    {
        var offer = new Offer("o", "mobile", "Example", 14.99m, 39m, [], [], true, true, null);
        var result = Assert.Single(new SavingsEngine().Calculate([Payment()], [offer]));
        Assert.Equal(201m, result.AnnualSaving);
        Assert.Equal("LOW", result.Confidence);
        Assert.Contains(result.Assumptions, s => s.Contains("ne sont pas connues"));
    }

    [Fact]
    public void ChoosesOneBestOfferPerPaymentAndRejectsInactiveOrNegativeSavings()
    {
        Offer O(string id, decimal price, bool active = true) =>
            new(id, "mobile", "Offer", price, 0, [], [], active, true, null);
        var result = Assert.Single(
            new SavingsEngine().Calculate(
                [Payment()],
                [O("expensive", 50), O("inactive", 0, false), O("best", 10), O("other", 20)]
            )
        );
        Assert.Equal("best", result.Offer.Id);
        var alternatives = new SavingsEngine().Alternatives(Payment(), [O("best", 10), O("other", 20)]);
        Assert.Equal(["best", "other"], alternatives.Select(r => r.Offer.Id));
        Assert.Empty(new SavingsEngine().Calculate([Payment()], [O("equal", 34.99m)]));
    }
}
