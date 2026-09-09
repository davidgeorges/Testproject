using System.Text.Json;
using Microsoft.Extensions.Caching.Distributed;
using SubscriptionApp.Application;
using SubscriptionApp.Domain;
using SubscriptionApp.Persistence;

namespace SubscriptionApp.Api;

public sealed class CachedOfferCatalog(PostgresOfferCatalog inner, IDistributedCache cache, ILogger<CachedOfferCatalog> logger) : IOfferCatalog
{
    private const string Key = "catalog:offers:v1";
    public async Task<IReadOnlyList<Offer>> GetOffers(CancellationToken ct)
    {
        try
        {
            var cached = await cache.GetStringAsync(Key, ct);
            if (cached is not null) return JsonSerializer.Deserialize<Offer[]>(cached) ?? [];
        }
        catch (Exception exception) { logger.LogWarning(exception, "Offer cache read failed"); }
        var offers = await inner.GetOffers(ct);
        try { await cache.SetStringAsync(Key, JsonSerializer.Serialize(offers), new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5) }, ct); }
        catch (Exception exception) { logger.LogWarning(exception, "Offer cache write failed"); }
        return offers;
    }

    public async Task<Offer> SaveOffer(Offer offer, CancellationToken ct)
    {
        var saved = await inner.SaveOffer(offer, ct); await Invalidate(ct); return saved;
    }

    public async Task<bool> DeactivateOffer(string id, CancellationToken ct)
    {
        var changed = await inner.DeactivateOffer(id, ct); if (changed) await Invalidate(ct); return changed;
    }

    private async Task Invalidate(CancellationToken ct)
    {
        try { await cache.RemoveAsync(Key, ct); }
        catch (Exception exception) { logger.LogWarning(exception, "Offer cache invalidation failed"); }
    }
}
