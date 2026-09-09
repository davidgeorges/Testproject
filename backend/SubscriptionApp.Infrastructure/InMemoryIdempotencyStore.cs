using SubscriptionApp.Application;

namespace SubscriptionApp.Infrastructure;

public sealed class InMemoryIdempotencyStore(TimeProvider time) : IIdempotencyStore
{
    private sealed record Entry(string Fingerprint, DateTimeOffset ExpiresAt, int? StatusCode, string? Body);
    private readonly object gate = new();
    private readonly Dictionary<string, Entry> entries = [];

    public Task<IdempotencyDecision> Begin(string cacheKey, string fingerprint, DateTimeOffset expiresAt, CancellationToken ct)
    {
        lock (gate)
        {
            if (entries.TryGetValue(cacheKey, out var entry) && entry.ExpiresAt <= time.GetUtcNow())
            {
                entries.Remove(cacheKey);
                entry = null;
            }
            if (entry is null)
            {
                entries[cacheKey] = new(fingerprint, expiresAt, null, null);
                return Task.FromResult(new IdempotencyDecision(IdempotencyState.Acquired));
            }
            if (entry.Fingerprint != fingerprint)
                return Task.FromResult(new IdempotencyDecision(IdempotencyState.Conflict));
            return Task.FromResult<IdempotencyDecision>(entry.StatusCode is null
                ? new(IdempotencyState.Pending)
                : new(IdempotencyState.Completed, entry.StatusCode, entry.Body));
        }
    }

    public Task Complete(string cacheKey, string fingerprint, int statusCode, string? responseBody, CancellationToken ct)
    {
        lock (gate)
            if (entries.TryGetValue(cacheKey, out var entry) && entry.Fingerprint == fingerprint)
                entries[cacheKey] = entry with { StatusCode = statusCode, Body = responseBody };
        return Task.CompletedTask;
    }

    public Task Abandon(string cacheKey, string fingerprint, CancellationToken ct)
    {
        lock (gate)
            if (entries.TryGetValue(cacheKey, out var entry) && entry.Fingerprint == fingerprint && entry.StatusCode is null)
                entries.Remove(cacheKey);
        return Task.CompletedTask;
    }
}
