using SubscriptionApp.Application;
using SubscriptionApp.Infrastructure;
using Xunit;

namespace SubscriptionApp.Tests;

public sealed class IdempotencyTests
{
    [Fact]
    public async Task StoreReservesCompletesReplaysAndRejectsDifferentFingerprint()
    {
        var store = new InMemoryIdempotencyStore(TimeProvider.System);
        var expiry = DateTimeOffset.UtcNow.AddHours(1);
        Assert.Equal(IdempotencyState.Acquired, (await store.Begin("key", "body-a", expiry, default)).State);
        Assert.Equal(IdempotencyState.Pending, (await store.Begin("key", "body-a", expiry, default)).State);
        Assert.Equal(IdempotencyState.Conflict, (await store.Begin("key", "body-b", expiry, default)).State);

        await store.Complete("key", "body-a", 201, "{\"id\":1}", default);
        var replay = await store.Begin("key", "body-a", expiry, default);
        Assert.Equal(IdempotencyState.Completed, replay.State);
        Assert.Equal(201, replay.StatusCode);
        Assert.Equal("{\"id\":1}", replay.ResponseBody);
    }

    [Fact]
    public async Task AbandonedReservationCanBeRetried()
    {
        var store = new InMemoryIdempotencyStore(TimeProvider.System);
        var expiry = DateTimeOffset.UtcNow.AddHours(1);
        Assert.Equal(IdempotencyState.Acquired, (await store.Begin("key", "body", expiry, default)).State);
        await store.Abandon("key", "body", default);
        Assert.Equal(IdempotencyState.Acquired, (await store.Begin("key", "body", expiry, default)).State);
    }
}
