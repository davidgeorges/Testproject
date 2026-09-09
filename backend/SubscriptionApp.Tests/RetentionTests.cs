using SubscriptionApp.Domain;
using SubscriptionApp.Infrastructure;
using Xunit;

namespace SubscriptionApp.Tests;

public sealed class RetentionTests
{
    [Fact]
    public async Task PurgeRemovesExpiredOperationalDataAndKeepsRecentRecords()
    {
        var store = new InMemoryWorkspaceStore();
        var userId = Guid.NewGuid().ToString();
        await store.Profile(userId, default);
        await store.AddNotification(new() { UserId = userId, SourceKey = "old", CreatedAt = DateTimeOffset.UtcNow.AddYears(-3) }, default);
        await store.AddNotification(new() { UserId = userId, SourceKey = "recent", CreatedAt = DateTimeOffset.UtcNow }, default);
        await store.AddAudit(new AuditLog { UserId = userId, Action = "old", CreatedAt = DateTimeOffset.UtcNow.AddYears(-3) }, default);

        Assert.Equal(2, await store.PurgeExpiredData(DateTimeOffset.UtcNow, default));
        Assert.Single(await store.Notifications(userId, default));
        Assert.Empty(await store.AuditLogs(userId, default));
    }
}
