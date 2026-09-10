using SubscriptionApp.Infrastructure;
using Xunit;

namespace SubscriptionApp.Tests;

public sealed class AccountDeletionTests
{
    [Fact]
    public async Task DeletionJobSurvivesUserDataPurgeAndIsIdempotent()
    {
        var store = new InMemoryWorkspaceStore();
        var userId = Guid.NewGuid().ToString();
        await store.Profile(userId, default);
        await store.AddConnection(new()
        {
            UserId = userId,
            BankName = "Banque test",
            Provider = "test",
            ExternalConnectionId = Guid.NewGuid().ToString(),
        }, default);
        var now = DateTimeOffset.UtcNow;
        var queued = await store.EnqueueAccountDeletion(userId, now, default);
        Assert.Equal(queued.Id, (await store.EnqueueAccountDeletion(userId, now, default)).Id);

        var claimed = Assert.IsType<SubscriptionApp.Domain.AccountDeletionJob>(
            await store.ClaimAccountDeletion(now, TimeSpan.FromMinutes(5), default)
        );
        await store.DeleteAccount(userId, default);
        await store.CompleteAccountDeletion(claimed.Id, "completed", now, default);

        Assert.Empty(await store.Connections(userId, default));
        var proof = await store.AccountDeletion(userId, default);
        Assert.NotNull(proof);
        Assert.Equal("completed", proof.Status);
    }
}
