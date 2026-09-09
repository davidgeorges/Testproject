using StackExchange.Redis;
using Xunit;

namespace SubscriptionApp.Tests;

public sealed class RedisFactAttribute : FactAttribute
{
    public RedisFactAttribute()
    {
        if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("TEST_REDIS"))) Skip = "Set TEST_REDIS to run Redis integration tests.";
    }
}

public sealed class RedisTests
{
    [RedisFact]
    public async Task SharedCacheCanRoundTripAndExpireCatalogValue()
    {
        await using var redis = await ConnectionMultiplexer.ConnectAsync(Environment.GetEnvironmentVariable("TEST_REDIS")!);
        var database = redis.GetDatabase();
        var key = $"integration:catalog:{Guid.NewGuid():N}";
        try
        {
            Assert.True(await database.StringSetAsync(key, "value", TimeSpan.FromMinutes(1)));
            Assert.Equal("value", (string?)await database.StringGetAsync(key));
            Assert.True(await database.KeyTimeToLiveAsync(key) > TimeSpan.Zero);
        }
        finally { await database.KeyDeleteAsync(key); }
    }
}
