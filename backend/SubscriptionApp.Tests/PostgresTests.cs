using Microsoft.EntityFrameworkCore;
using SubscriptionApp.Domain;
using SubscriptionApp.Persistence;
using Xunit;

namespace SubscriptionApp.Tests;

public sealed class PostgresFactAttribute : FactAttribute
{
    public PostgresFactAttribute()
    {
        if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("TEST_POSTGRES")))
            Skip =
                "Set TEST_POSTGRES to a dedicated PostgreSQL test database to run integration tests.";
    }
}

public sealed class PostgresTests
{
    [PostgresFact]
    public async Task MigrationsSyncDeduplicationAndDeletionWorkWithPostgres()
    {
        var options = new DbContextOptionsBuilder<WorkspaceDbContext>()
            .UseNpgsql(Environment.GetEnvironmentVariable("TEST_POSTGRES"))
            .Options;
        await using var db = new WorkspaceDbContext(options);
        await db.Database.MigrateAsync();
        var store = new PostgresWorkspaceStore(db);
        var userId = $"integration-{Guid.NewGuid()}";
        try
        {
            var bank = new BankConnection { UserId = userId, BankName = "Integration test" };
            await store.AddConnection(bank, default);
            BankTransaction Row() =>
                new()
                {
                    UserId = userId,
                    ConnectionId = bank.Id,
                    AccountKey = bank.Id.ToString(),
                    ExternalId = $"{bank.Id}:one",
                    Amount = -19.99m,
                    BookedAt = new(2026, 9, 1),
                    MerchantName = "Test service",
                };
            await store.Synchronize(bank, [Row()], default);
            await store.Synchronize(bank, [Row()], default);
            Assert.Single(await store.Transactions(userId, default));
            Assert.Single(await store.Accounts(userId, default));
            Assert.Empty(await store.Transactions($"other-{userId}", default));
            var click = new RecommendationEvent { UserId = userId, RecommendationId = "test" };
            await store.AddEvent(click, default);
            await store.AddNotification(new() { UserId = userId, SourceKey = $"test-{Guid.NewGuid()}" }, default);
            var concurrentSource = $"concurrent-{Guid.NewGuid()}";
            await using (var leftDb = new WorkspaceDbContext(options))
            await using (var rightDb = new WorkspaceDbContext(options))
            {
                var left = new PostgresWorkspaceStore(leftDb);
                var right = new PostgresWorkspaceStore(rightDb);
                await Task.WhenAll(
                    left.AddNotification(new() { UserId = userId, SourceKey = concurrentSource }, default),
                    right.AddNotification(new() { UserId = userId, SourceKey = concurrentSource }, default)
                );
            }
            Assert.Equal(1, await db.Notifications.AsNoTracking().CountAsync(n => n.UserId == userId && n.SourceKey == concurrentSource));
            await store.SavePushDevice(new() { UserId = userId, Platform = "android", Token = new string('t', 40) }, default);
            var claimedPush = await store.ClaimPushNotifications(100, DateTimeOffset.UtcNow, TimeSpan.FromMinutes(2), default);
            Assert.Contains(claimedPush, n => n.UserId == userId);
            var secondClaim = await store.ClaimPushNotifications(100, DateTimeOffset.UtcNow.AddMinutes(1), TimeSpan.FromMinutes(2), default);
            Assert.DoesNotContain(secondClaim, n => n.UserId == userId);
            await store.EnqueueSync(new() { UserId = userId, ConnectionId = bank.Id }, default);
            Assert.True(await store.SaveAffiliateConversion(new() { UserId = userId, RecommendationEventId = click.Id, Provider = "test", ExternalConversionId = Guid.NewGuid().ToString() }, default));
            Assert.Single(await store.Consents(userId, default));
            await store.DeleteAccount(userId, default);
            Assert.Empty(await store.Connections(userId, default));
            Assert.Empty(await store.Transactions(userId, default));
            Assert.Empty(await store.Accounts(userId, default));
            Assert.Empty(await store.Consents(userId, default));
            Assert.False(await db.Events.AnyAsync(e => e.UserId == userId));
            Assert.False(await db.Notifications.AnyAsync(e => e.UserId == userId));
            Assert.False(await db.PushDevices.AnyAsync(e => e.UserId == userId));
            Assert.False(await db.SyncJobs.AnyAsync(e => e.UserId == userId));
            Assert.False(await db.AffiliateConversions.AnyAsync(e => e.UserId == userId));
        }
        finally
        {
            await store.DeleteAccount(userId, default);
        }
    }
}
