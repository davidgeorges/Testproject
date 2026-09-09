using Microsoft.EntityFrameworkCore;
using Npgsql;
using SubscriptionApp.Application;
using SubscriptionApp.Domain;

namespace SubscriptionApp.Persistence;

public sealed class PostgresIdempotencyStore(WorkspaceDbContext db, TimeProvider time) : IIdempotencyStore
{
    public async Task<IdempotencyDecision> Begin(string cacheKey, string fingerprint, DateTimeOffset expiresAt, CancellationToken ct)
    {
        await db.IdempotencyRecords.Where(r => r.ExpiresAt <= time.GetUtcNow()).ExecuteDeleteAsync(ct);
        db.IdempotencyRecords.Add(new() { CacheKey = cacheKey, Fingerprint = fingerprint, ExpiresAt = expiresAt });
        try
        {
            await db.SaveChangesAsync(ct);
            return new(IdempotencyState.Acquired);
        }
        catch (DbUpdateException exception) when (exception.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            db.ChangeTracker.Clear();
            var existing = await db.IdempotencyRecords.AsNoTracking().SingleAsync(r => r.CacheKey == cacheKey, ct);
            if (existing.Fingerprint != fingerprint) return new(IdempotencyState.Conflict);
            return existing.StatusCode is null
                ? new(IdempotencyState.Pending)
                : new(IdempotencyState.Completed, existing.StatusCode, existing.ResponseBody);
        }
    }

    public async Task Complete(string cacheKey, string fingerprint, int statusCode, string? responseBody, CancellationToken ct) =>
        _ = await db.IdempotencyRecords
            .Where(r => r.CacheKey == cacheKey && r.Fingerprint == fingerprint)
            .ExecuteUpdateAsync(s => s.SetProperty(r => r.StatusCode, statusCode).SetProperty(r => r.ResponseBody, responseBody), ct);

    public async Task Abandon(string cacheKey, string fingerprint, CancellationToken ct) =>
        _ = await db.IdempotencyRecords
            .Where(r => r.CacheKey == cacheKey && r.Fingerprint == fingerprint && r.StatusCode == null)
            .ExecuteDeleteAsync(ct);
}
